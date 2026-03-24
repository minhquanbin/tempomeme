// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMemeToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BondingCurve {
    uint256 public constant TOTAL_SUPPLY          = 833168568e18;
    uint256 public constant CURVE_SUPPLY          = 666534854e18;
    uint256 public constant LP_SUPPLY             = 166633714e18;
    uint256 public constant VIRTUAL_USD_RESERVE   = 30000e6;
    uint256 public constant VIRTUAL_TOKEN_RESERVE = 1073000191e18;
    uint256 public constant GRADUATION_USD        = 69000e6;
    uint256 public constant FEE_BPS               = 100;

    address public token;
    address public usdToken;
    address public factory;
    address public feeRecipient;
    uint256 public usdReserve;
    bool    public graduated;

    event Buy(address indexed buyer, uint256 usdIn, uint256 tokenOut, uint256 price, uint256 marketCap);
    event Sell(address indexed seller, uint256 tokenIn, uint256 usdOut, uint256 price, uint256 marketCap);
    event Graduated(address indexed token, uint256 usdCollected);

    error AlreadyGraduated();
    error ZeroAmount();
    error SlippageExceeded();
    error MaxSupplyReached();
    error InsufficientReserve();
    error NotFactory();
    error TokenAlreadySet();

    constructor(address _token, address _usdToken, address _feeRecipient) {
        token        = _token;
        usdToken     = _usdToken;
        factory      = msg.sender;
        feeRecipient = _feeRecipient;
        usdReserve   = 0;
    }

    function setToken(address _token) external {
        if (msg.sender != factory) revert NotFactory();
        if (token != address(0)) revert TokenAlreadySet();
        token = _token;
    }

    function getBuyAmount(uint256 usdIn) public view returns (uint256 tokenOut) {
        if (usdIn == 0) return 0;
        uint256 currentSupply     = IMemeToken(token).totalSupply();
        uint256 effectiveTokenRes = VIRTUAL_TOKEN_RESERVE - currentSupply;
        uint256 effectiveUSDRes   = VIRTUAL_USD_RESERVE + usdReserve;
        uint256 newUSDRes         = effectiveUSDRes + usdIn;
        uint256 newTokenRes       = (effectiveTokenRes * effectiveUSDRes) / newUSDRes;
        tokenOut = effectiveTokenRes - newTokenRes;
    }

    function getSellAmount(uint256 tokenIn) public view returns (uint256 usdOut) {
        if (tokenIn == 0) return 0;
        uint256 currentSupply     = IMemeToken(token).totalSupply();
        uint256 effectiveTokenRes = VIRTUAL_TOKEN_RESERVE - currentSupply;
        uint256 effectiveUSDRes   = VIRTUAL_USD_RESERVE + usdReserve;
        uint256 newTokenRes       = effectiveTokenRes + tokenIn;
        uint256 newUSDRes         = (effectiveUSDRes * effectiveTokenRes) / newTokenRes;
        usdOut = effectiveUSDRes - newUSDRes;
    }

    function getCurrentPrice() public view returns (uint256) {
        uint256 currentSupply     = IMemeToken(token).totalSupply();
        uint256 effectiveTokenRes = VIRTUAL_TOKEN_RESERVE - currentSupply;
        uint256 effectiveUSDRes   = VIRTUAL_USD_RESERVE + usdReserve;
        uint256 step1 = effectiveUSDRes * 1_000_000_000_000;
        uint256 step2 = step1 * 1_000_000_000_000_000_000;
        return step2 / effectiveTokenRes;
    }

    function getMarketCap() public view returns (uint256) {
        uint256 price  = getCurrentPrice();
        uint256 supply = IMemeToken(token).totalSupply();
        if (supply == 0) return 0;
        return (price * supply) / 1_000_000_000_000_000_000_000_000_000_000;
    }

    function getGraduationProgress() public view returns (uint256) {
        if (graduated) return 100;
        if (GRADUATION_USD == 0) return 0;
        return (usdReserve * 100) / GRADUATION_USD;
    }

    function buy(uint256 usdIn, uint256 minTokenOut) external returns (uint256 tokenOut) {
        if (graduated) revert AlreadyGraduated();
        if (usdIn == 0) revert ZeroAmount();
        uint256 fee         = (usdIn * FEE_BPS) / 10000;
        uint256 usdAfterFee = usdIn - fee;
        tokenOut = getBuyAmount(usdAfterFee);
        if (tokenOut < minTokenOut) revert SlippageExceeded();
        uint256 currentSupply = IMemeToken(token).totalSupply();
        if (currentSupply + tokenOut > CURVE_SUPPLY) revert MaxSupplyReached();
        IERC20(usdToken).transferFrom(msg.sender, address(this), usdIn);
        if (fee > 0) IERC20(usdToken).transfer(feeRecipient, fee);
        usdReserve += usdAfterFee;
        IMemeToken(token).mint(msg.sender, tokenOut);
        emit Buy(msg.sender, usdIn, tokenOut, getCurrentPrice(), getMarketCap());
        if (usdReserve >= GRADUATION_USD) _graduate();
    }

    function sell(uint256 tokenIn, uint256 minUSDOut) external returns (uint256 usdOut) {
        if (graduated) revert AlreadyGraduated();
        if (tokenIn == 0) revert ZeroAmount();
        usdOut = getSellAmount(tokenIn);
        if (usdOut > usdReserve) revert InsufficientReserve();
        uint256 fee         = (usdOut * FEE_BPS) / 10000;
        uint256 usdAfterFee = usdOut - fee;
        if (usdAfterFee < minUSDOut) revert SlippageExceeded();
        IMemeToken(token).burn(msg.sender, tokenIn);
        usdReserve -= usdOut;
        if (fee > 0) IERC20(usdToken).transfer(feeRecipient, fee);
        IERC20(usdToken).transfer(msg.sender, usdAfterFee);
        emit Sell(msg.sender, tokenIn, usdAfterFee, getCurrentPrice(), getMarketCap());
    }

    function _graduate() internal {
        graduated = true;
        emit Graduated(token, usdReserve);
    }
}

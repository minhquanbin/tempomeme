// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;



interface IERC20Pool {

    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function totalSupply() external view returns (uint256);

}



contract LiquidityPool {

    address public token;

    address public usdToken;

    address public factory;

    address public sale;

    address public creator;

    address public feeRecipient;

    uint256 public tokenReserve;

    uint256 public usdReserve;

    uint256 public totalLP;

    mapping(address => uint256) public lpBalance;



    uint256 public constant PLATFORM_FEE_BPS = 20;
    uint256 public constant LP_FEE_BPS       = 30;

    uint256 public constant CREATOR_REWARD    = 1_000e6;

    uint256 public constant DUST_THRESHOLD_BPS = 1;

    uint256 public constant PROTECTION_PERIOD = 3 minutes;

    uint256 public constant INACTIVE_PERIOD   = 2 minutes;

    uint256 public constant REDEEM_PERIOD     = 2 minutes;

    uint256 public constant MIN_SWAP_RESET    = 10e6;



    uint256 public graduationTime;

    uint256 public lastSwapTime;

    bool    public graduated;



    event Swap(address indexed user, bool buyToken, uint256 amountIn, uint256 amountOut);

    event AddLiquidity(address indexed user, uint256 lp);

    event Graduated(address indexed pool, uint256 tokenAmt, uint256 usdAmt);

    event Redeemed(address indexed user, uint256 tokenIn, uint256 usdOut);

    event TreasuryRecovered(address indexed treasury, uint256 usdAmt, uint256 tokenAmt);



    error NotAuthorized();

    error ZeroAmount();

    error SlippageExceeded();

    error InsufficientLiquidity();

    error AlreadyGraduated();

    error AlreadyInitialized();

    error NotClaimable();

    error RedeemPeriodEnded();

    error RedeemPeriodNotEnded();



    constructor(address _token, address _usdToken) {

        token    = _token;

        usdToken = _usdToken;

        factory  = msg.sender;

    }



    function initClone(address _factory, address _usdToken) external {

        // Fix: only _factory itself may initialize a fresh clone.

        // Prevents any other address from hijacking factory on a newly-deployed clone.

        if (msg.sender != _factory) revert NotAuthorized();

        if (factory != address(0)) revert AlreadyInitialized();

        factory  = _factory;

        usdToken = _usdToken;

    }



    function setToken(address _token) external {

        if (msg.sender != factory) revert NotAuthorized();

        token = _token;

    }



    function setSale(address _sale) external {

        if (msg.sender != factory) revert NotAuthorized();

        sale = _sale;

    }



    function setFeeRecipient(address _feeRecipient) external {

        if (msg.sender != factory) revert NotAuthorized();

        feeRecipient = _feeRecipient;

    }



    function initialize(uint256 tokenAmt, uint256 usdAmt, address _creator) external {

        if (msg.sender != factory && msg.sender != sale) revert NotAuthorized();

        if (graduated) revert AlreadyGraduated();

        graduated      = true;

        graduationTime = block.timestamp;

        lastSwapTime   = block.timestamp;

        creator        = _creator;

        uint256 creatorReward = usdAmt >= CREATOR_REWARD ? CREATOR_REWARD : 0;

        uint256 usdForPool    = usdAmt - creatorReward;

        if (creatorReward > 0) IERC20Pool(usdToken).transfer(creator, creatorReward);

        tokenReserve = tokenAmt;

        usdReserve   = usdForPool;

        uint256 lp   = _sqrt(tokenAmt * usdForPool);

        totalLP      = lp;

        lpBalance[address(1)] = lp;

        emit Graduated(address(this), tokenAmt, usdForPool);

    }



    function isClaimable() public view returns (bool) {

        if (!graduated) return false;

        if (block.timestamp < graduationTime + PROTECTION_PERIOD) return false;

        if (block.timestamp <= lastSwapTime + INACTIVE_PERIOD) return false;

        return true;

    }



    function isRedeemPeriodEnded() public view returns (bool) {

        if (!isClaimable()) return false;

        return block.timestamp > (lastSwapTime + INACTIVE_PERIOD + REDEEM_PERIOD);

    }



    function timeUntilClaimable() external view returns (uint256) {

        if (!graduated) return type(uint256).max;

        uint256 protectionEnd = graduationTime + PROTECTION_PERIOD;

        if (block.timestamp < protectionEnd) return protectionEnd - block.timestamp;

        uint256 inactiveEnd = lastSwapTime + INACTIVE_PERIOD;

        if (block.timestamp < inactiveEnd) return inactiveEnd - block.timestamp;

        return 0;

    }



    function buyToken(uint256 usdIn, uint256 minTokenOut) external nonReentrant {
        require(!_isProtected(), "ProtectionPeriod");
        require(usdIn > 0, "ZeroAmount");

        uint256 platformFee = usdIn * PLATFORM_FEE_BPS / 10000;
        uint256 lpFee       = usdIn * LP_FEE_BPS / 10000;
        uint256 usdNet      = usdIn - platformFee - lpFee;

        uint256 tokenOut = tokenReserve * usdNet / (usdReserve + usdNet);
        require(tokenOut >= minTokenOut, "SlippageExceeded");
        require(tokenOut < tokenReserve, "InsufficientReserve");

        usdReserve   += usdNet + lpFee;
        tokenReserve -= tokenOut;
        lastSwapTime  = block.timestamp;

        IERC20(usdToken).transferFrom(msg.sender, address(this), usdIn);
        IERC20(usdToken).transfer(feeRecipient, platformFee);
        IERC20(token).transfer(msg.sender, tokenOut);

        emit TokenPurchased(msg.sender, usdIn, tokenOut);
    }



    function sellToken(uint256 tokenIn, uint256 minUsdOut) external nonReentrant {
        require(!_isProtected(), "ProtectionPeriod");
        require(tokenIn > 0, "ZeroAmount");

        uint256 tokenLpFee  = tokenIn * LP_FEE_BPS / 10000;
        uint256 tokenNet    = tokenIn - tokenLpFee;

        uint256 usdGross    = usdReserve * tokenNet / (tokenReserve + tokenNet);
        uint256 platformFee = usdGross * PLATFORM_FEE_BPS / 10000;
        uint256 usdOut      = usdGross - platformFee;

        require(usdOut >= minUsdOut, "SlippageExceeded");
        require(usdOut > 0, "InsufficientReserve");

        tokenReserve += tokenIn;
        usdReserve   -= usdGross;
        lastSwapTime  = block.timestamp;

        IERC20(token).transferFrom(msg.sender, address(this), tokenIn);
        IERC20(usdToken).transfer(feeRecipient, platformFee);
        IERC20(usdToken).transfer(msg.sender, usdOut);

        emit TokenSold(msg.sender, tokenIn, usdOut);
    }



    function redeemTokenForUSD(uint256 tokenIn, uint256 minUsdOut) external {

        if (!isClaimable()) revert NotClaimable();

        if (isRedeemPeriodEnded()) revert RedeemPeriodEnded();

        if (tokenIn == 0) revert ZeroAmount();

        if (usdReserve == 0) revert InsufficientLiquidity();

        uint256 totalSupply_ = IERC20Pool(token).totalSupply();

        if (totalSupply_ == 0) revert ZeroAmount();

        uint256 usdOut = usdReserve * tokenIn / totalSupply_;

        if (usdOut < minUsdOut) revert SlippageExceeded();

        tokenReserve += tokenIn;

        usdReserve   -= usdOut;

        IERC20Pool(token).transferFrom(msg.sender, address(this), tokenIn);

        IERC20Pool(usdToken).transfer(msg.sender, usdOut);

        emit Redeemed(msg.sender, tokenIn, usdOut);

        // Auto-recover if circulating supply drops below dust threshold (0.001% of total)

        uint256 updatedReserve = tokenReserve; uint256 remainingCirculating = totalSupply_ > updatedReserve ? totalSupply_ - updatedReserve : 0;

        bool isDust = totalSupply_ == 0 ? true : remainingCirculating * 100000 / totalSupply_ <= DUST_THRESHOLD_BPS;

        if (isDust && usdReserve > 0) {

            uint256 usdLeft = usdReserve;

            usdReserve = 0;

            IERC20Pool(usdToken).transfer(feeRecipient, usdLeft);

            emit TreasuryRecovered(feeRecipient, usdLeft, 0);

        }

    }



    function recoverToTreasury() external {

        if (!isRedeemPeriodEnded()) revert RedeemPeriodNotEnded();

        uint256 usdAmt   = usdReserve;

        uint256 tokenAmt = tokenReserve;

        usdReserve   = 0;

        tokenReserve = 0;

        if (usdAmt > 0)   IERC20Pool(usdToken).transfer(feeRecipient, usdAmt);

        // tokenAmt stays locked in contract (no transfer needed)

        emit TreasuryRecovered(feeRecipient, usdAmt, tokenAmt);

    }



    function addLiquidity(uint256 usdIn, uint256 minLP) external returns (uint256 lp) {

        if (usdIn == 0) revert ZeroAmount();

        uint256 tokenIn = tokenReserve * usdIn / usdReserve;

        lp = totalLP * usdIn / usdReserve;

        if (lp < minLP) revert SlippageExceeded();

        IERC20Pool(usdToken).transferFrom(msg.sender, address(this), usdIn);

        IERC20Pool(token).transferFrom(msg.sender, address(this), tokenIn);

        usdReserve   += usdIn;

        tokenReserve += tokenIn;

        totalLP      += lp;

        lpBalance[msg.sender] += lp;

        emit AddLiquidity(msg.sender, lp);

    }



    function getPrice() external view returns (uint256) {

        if (tokenReserve == 0) return 0;

        return usdReserve * 1e18 / tokenReserve;

    }



    function getBuyQuote(uint256 usdIn) external view returns (uint256 tokenOut) {

        uint256 usdNet = usdIn * (10000 - PLATFORM_FEE_BPS - LP_FEE_BPS) / 10000;

        tokenOut = tokenReserve * usdNet / (usdReserve + usdNet);

    }



    function getSellQuote(uint256 tokenIn) external view returns (uint256 usdOut) {

        uint256 tokenNet = tokenIn * (10000 - LP_FEE_BPS) / 10000;

        uint256 usdGross = usdReserve * tokenNet / (tokenReserve + tokenNet);


        usdOut = usdGross * (10000 - PLATFORM_FEE_BPS) / 10000;

    }



    function getRedeemQuote(uint256 tokenIn) external view returns (uint256 usdOut) {

        uint256 totalSupply_ = IERC20Pool(token).totalSupply();

        if (totalSupply_ == 0) return 0;

        usdOut = usdReserve * tokenIn / totalSupply_;

    }



    function _sqrt(uint256 x) internal pure returns (uint256 y) {

        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;

        y = x;

        while (z < y) { y = z; z = (x / z + z) / 2; }

    }

}



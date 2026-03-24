// SPDX-License-Identifier: MIT


pragma solidity ^0.8.28;





interface IERC20 {


    function transfer(address to, uint256 amount) external returns (bool);


    function transferFrom(address from, address to, uint256 amount) external returns (bool);


    function balanceOf(address account) external view returns (uint256);


}





interface ILiquidityPool {


    function initialize(uint256 tokenAmt, uint256 usdAmt, address creator) external;


    function getPrice() external view returns (uint256);


    function getBuyQuote(uint256 usdIn) external view returns (uint256 tokenOut);


    function getSellQuote(uint256 tokenIn) external view returns (uint256 usdOut);


}





interface IFactory {


    function deployPool(address token) external returns (address pool);


}





contract TokenSale {
    uint8 private _status;
    modifier nonReentrant() {
        require(_status == 0, "Reentrant call");
        _status = 1;
        _;
        _status = 0;
    }



    uint256 public constant TOTAL_SUPPLY      = 1_000_000_000e18;


    uint256 public constant PHASE1_SUPPLY     =   100_000_000e18;


    uint256 public constant PHASE2_SUPPLY     =   700_000_000e18;


    uint256 public constant P1_PRICE          = 100_000_000_000_000_000;


    uint256 public constant VIRTUAL_TOKEN_RES = 1_000_000_000e18;


    uint256 public constant VIRTUAL_USD_RES   = 30_455e6;


    uint256 public constant FEE_BPS           = 100;


    uint256 public constant GRADUATION_TARGET = 69_000e6;


    uint256 public constant MAX_DEV_BUY       = 500e6;





    address public token;


    address public usdToken;


    address public factory;


    address public feeRecipient;


    address public liquidityPool;


    address public poolImplementation;


    uint256 public phase1Sold;


    uint256 public phase2Sold;


    uint256 public usdReserve;


    bool    public graduated;





    event Buy(address indexed buyer, uint256 usdIn, uint256 tokenOut, uint8 phase);


    event Sell(address indexed seller, uint256 tokenIn, uint256 usdOut, uint8 phase);


    event PhaseChanged(uint8 newPhase);


    event Graduated(address indexed pool, uint256 tokenAmt, uint256 usdAmt);





    error ZeroAmount();


    error SlippageExceeded();


    error NoTokensLeft();


    error InsufficientReserve();


    error NotFactory();


    error TokenAlreadySet();


    error IsGraduated();





    constructor(address _token, address _usdToken, address _feeRecipient) {


        token        = _token;


        usdToken     = _usdToken;


        factory      = msg.sender;


        feeRecipient = _feeRecipient;


    }





    function setToken(address _token) external {


        if (msg.sender != factory) revert NotFactory();


        if (token != address(0)) revert TokenAlreadySet();


        token = _token;


    }





    function setPoolImplementation(address _impl) external {


        if (msg.sender != factory) revert NotFactory();


        poolImplementation = _impl;


    }





    function setFeeRecipient(address _feeRecipient) external {


        if (msg.sender != factory) revert NotFactory();


        feeRecipient = _feeRecipient;


    }





    function currentPhase() public view returns (uint8) {


        if (graduated) return 3;


        return phase1Sold >= PHASE1_SUPPLY ? 2 : 1;


    }





    function totalSold() public view returns (uint256) { return phase1Sold + phase2Sold; }


    function tokensRemaining() public view returns (uint256) { return TOTAL_SUPPLY - totalSold(); }





    function getCurrentPrice() public view returns (uint256) {


        if (graduated) return ILiquidityPool(liquidityPool).getPrice();


        if (currentPhase() == 1) return 10; // 0.00001 USD * 1e6 = 10 usd_units per full token (nhÃ¡ÂºÂ¥t quÃƒÂ¡n vÃ¡Â»â€ºi getPrice())


        uint256 effToken = VIRTUAL_TOKEN_RES - phase2Sold;


        uint256 effUSD   = VIRTUAL_USD_RES + usdReserve;


        return effUSD * 1e18 / effToken;


    }





    function getMarketCap() public view returns (uint256) {


        if (totalSold() == 0) return 0;


        if (currentPhase() == 1) return TOTAL_SUPPLY / 1e17;


        return TOTAL_SUPPLY * getCurrentPrice() / 1e18;


    }





    function getBuyQuote(uint256 usdIn) public view returns (uint256 tokenOut, uint8 phase) {


        if (usdIn == 0) return (0, currentPhase());


        phase = currentPhase();


        if (phase == 3) { tokenOut = ILiquidityPool(liquidityPool).getBuyQuote(usdIn); return (tokenOut, phase); }


        uint256 fee    = usdIn * FEE_BPS / 10000;


        uint256 netUsd = usdIn - fee;


        if (phase == 1) {


            uint256 p1Rem = PHASE1_SUPPLY - phase1Sold;


            uint256 p1Tok = netUsd * P1_PRICE;


            if (p1Tok <= p1Rem) { tokenOut = p1Tok; }


            else {


                uint256 usdForP1 = p1Rem / P1_PRICE;


                tokenOut = p1Rem + _ammBuy(netUsd - usdForP1, 0);


            }


        } else { tokenOut = _ammBuy(netUsd, phase2Sold); }


    }





    function getSellQuote(uint256 tokenIn) public view returns (uint256 usdOut, uint8 phase) {


        if (tokenIn == 0) return (0, currentPhase());


        phase = currentPhase();


        if (phase == 3) { usdOut = ILiquidityPool(liquidityPool).getSellQuote(tokenIn); return (usdOut, phase); }


        uint256 gross;


        if (phase == 1) { gross = tokenIn / P1_PRICE; }


        else {


            uint256 p2Tok = tokenIn <= phase2Sold ? tokenIn : phase2Sold;


            uint256 p1Tok = tokenIn > phase2Sold ? tokenIn - phase2Sold : 0;


            gross = (p2Tok > 0 ? _ammSell(p2Tok) : 0) + (p1Tok > 0 ? p1Tok / P1_PRICE : 0);


        }


        uint256 fee = gross * FEE_BPS / 10000;


        usdOut = gross - fee;


    }





    function _ammBuy(uint256 netUsd, uint256 alreadySold) internal view returns (uint256) {


        uint256 effToken = VIRTUAL_TOKEN_RES - alreadySold;


        uint256 effUSD   = VIRTUAL_USD_RES + usdReserve;


        uint256 newUSD   = effUSD + netUsd;


        uint256 newToken = effToken * effUSD / newUSD;


        return effToken - newToken;


    }





    function _ammSell(uint256 tokenIn) internal view returns (uint256) {


        uint256 effToken = VIRTUAL_TOKEN_RES - phase2Sold;


        uint256 effUSD   = VIRTUAL_USD_RES + usdReserve;


        uint256 newToken = effToken + tokenIn;


        uint256 newUSD   = effUSD * effToken / newToken;


        return effUSD - newUSD;


    }





    function _buyPhase2(uint256 netUsd, address buyer, uint256 p1TokOwed) internal returns (uint256 p2Tok) {


        uint256 usdNeeded = GRADUATION_TARGET > usdReserve ? GRADUATION_TARGET - usdReserve : 0;


        uint256 refundUsd;


        uint256 usdForP2 = netUsd;


        if (usdNeeded == 0) {


            refundUsd = netUsd;


            usdForP2  = 0;


        } else if (netUsd > usdNeeded) {


            refundUsd = netUsd - usdNeeded;


            usdForP2  = usdNeeded;


        }


        if (usdForP2 > 0) {


            uint256 p2Cap = PHASE2_SUPPLY - phase2Sold;


            p2Tok = _ammBuy(usdForP2, phase2Sold);


            if (p2Tok > p2Cap) p2Tok = p2Cap;


            phase2Sold += p2Tok;


            usdReserve += usdForP2;


        }


        if (refundUsd > 0) IERC20(usdToken).transfer(buyer, refundUsd);


        if (!graduated && usdReserve >= GRADUATION_TARGET) {


            graduated = true;


            if (p1TokOwed > 0) IERC20(token).transfer(buyer, p1TokOwed);


            if (p2Tok > 0) { IERC20(token).transfer(buyer, p2Tok); p2Tok = 0; }


            address pool = IFactory(factory).deployPool(token);


            liquidityPool = pool;


            uint256 tokenAmt = IERC20(token).balanceOf(address(this));


            uint256 usdAmt   = usdReserve;


            usdReserve = 0;


            IERC20(token).transfer(pool, tokenAmt);


            IERC20(usdToken).transfer(pool, usdAmt);


            ILiquidityPool(pool).initialize(tokenAmt, usdAmt, buyer);


            emit Graduated(pool, tokenAmt, usdAmt);


        }


    }





    function buy(uint256 usdIn, uint256 minTokenOut) external nonReentrant returns (uint256 tokenOut) {


        if (graduated) revert IsGraduated();


        if (usdIn == 0) revert ZeroAmount();


        if (tokensRemaining() == 0) revert NoTokensLeft();


        uint256 fee    = usdIn * FEE_BPS / 10000;


        uint256 netUsd = usdIn - fee;


        IERC20(usdToken).transferFrom(msg.sender, address(this), usdIn);


        if (fee > 0) IERC20(usdToken).transfer(feeRecipient, fee);


        uint8 phase = currentPhase();


        if (phase == 1) {


            uint256 p1Rem = PHASE1_SUPPLY - phase1Sold;


            uint256 p1Tok = netUsd * P1_PRICE;


            if (p1Tok <= p1Rem) {


                tokenOut    = p1Tok;


                phase1Sold += tokenOut;


                usdReserve += netUsd;


            } else {


                uint256 usdForP1 = p1Rem / P1_PRICE;


                uint256 usdForP2 = netUsd - usdForP1;


                phase1Sold = PHASE1_SUPPLY;


                usdReserve += usdForP1;


                tokenOut = p1Rem;


                emit PhaseChanged(2);


                tokenOut += _buyPhase2(usdForP2, msg.sender, p1Rem);


            }


        } else {


            tokenOut = _buyPhase2(netUsd, msg.sender, 0);


        }


        if (tokenOut < minTokenOut) revert SlippageExceeded();


        if (tokenOut > 0 && !graduated) IERC20(token).transfer(msg.sender, tokenOut);


        emit Buy(msg.sender, usdIn, tokenOut, phase);


    }





    function sell(uint256 tokenIn, uint256 minUSDOut) external nonReentrant returns (uint256 usdOut) {


        if (graduated) revert IsGraduated();


        if (tokenIn == 0) revert ZeroAmount();


        uint8 phase = currentPhase();


        uint256 gross;


        if (phase == 1) {


            // P1_PRICE lÃƒÂ  scale factor: tokenOut = usdIn * P1_PRICE => nghÃ¡Â»â€¹ch Ã„â€˜Ã¡ÂºÂ£o: usdOut = tokenIn / P1_PRICE


            gross = tokenIn / P1_PRICE;


            if (gross > usdReserve) revert InsufficientReserve();


            phase1Sold -= tokenIn;


            usdReserve -= gross;


        } else {


            uint256 p2Tok = tokenIn <= phase2Sold ? tokenIn : phase2Sold;


            uint256 p1Tok = tokenIn > phase2Sold ? tokenIn - phase2Sold : 0;


            uint256 grossP2 = p2Tok > 0 ? _ammSell(p2Tok) : 0;


            uint256 grossP1 = p1Tok > 0 ? p1Tok / P1_PRICE : 0;


            gross = grossP2 + grossP1;


            if (gross > usdReserve) revert InsufficientReserve();


            if (p2Tok > 0) phase2Sold -= p2Tok;


            if (p1Tok > 0) phase1Sold -= p1Tok;


            usdReserve -= gross;


        }


        uint256 fee = gross * FEE_BPS / 10000;


        usdOut = gross - fee;


        if (usdOut < minUSDOut) revert SlippageExceeded();


        IERC20(token).transferFrom(msg.sender, address(this), tokenIn);


        if (fee > 0) IERC20(usdToken).transfer(feeRecipient, fee);


        IERC20(usdToken).transfer(msg.sender, usdOut);


        emit Sell(msg.sender, tokenIn, usdOut, phase);


    }





    function devBuy(address devAddr, uint256 usdIn) external {


        if (msg.sender != factory) revert NotFactory();


        if (usdIn == 0) return;


        if (usdIn > MAX_DEV_BUY) usdIn = MAX_DEV_BUY;


        uint256 fee      = usdIn * FEE_BPS / 10000;


        uint256 netUsd   = usdIn - fee;


        uint256 p1Cap    = PHASE1_SUPPLY / 2;


        uint256 tokenOut = netUsd * P1_PRICE;


        if (tokenOut > p1Cap) tokenOut = p1Cap;


        phase1Sold += tokenOut;


        usdReserve += netUsd;


        if (fee > 0) IERC20(usdToken).transfer(feeRecipient, fee);


        IERC20(token).transfer(devAddr, tokenOut);


        emit Buy(devAddr, usdIn, tokenOut, 1);


    }


}






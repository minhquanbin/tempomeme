// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MemeToken.sol";
import "./TokenSale.sol";
import "./LiquidityPool.sol";

interface IERC20Approve {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MemeFactory {
    address public owner;
    address public usdToken;
    address public feeRecipient;
    address public poolImplementation;
    address[] public allTokens;
    mapping(address => address) public tokenToSale;
    mapping(address => address) public tokenToPool;
    mapping(address => address[]) public creatorTokens;

    event MemeCreated(address indexed token, address indexed sale, address indexed creator, string name, string symbol, string imageURI, uint256 devBuyUSD);
    event PoolImplementationUpdated(address indexed oldImpl, address indexed newImpl);
    event PoolDeployed(address indexed token, address indexed pool);

    error NotOwner();
    error ZeroAddress();
    error NoPoolImplementation();
    error PoolAlreadyDeployed();
    error NotSale();

    constructor(address _usdToken, address _feeRecipient, address _poolImplementation) {
        owner              = msg.sender;
        usdToken           = _usdToken;
        feeRecipient       = _feeRecipient;
        poolImplementation = _poolImplementation;
    }

    function setPoolImplementation(address _impl) external {
        if (msg.sender != owner) revert NotOwner();
        if (_impl == address(0)) revert ZeroAddress();
        emit PoolImplementationUpdated(poolImplementation, _impl);
        poolImplementation = _impl;
    }

    function deployNewPoolImplementation() external {
        if (msg.sender != owner) revert NotOwner();
        address newImpl = address(new LiquidityPool(address(0), usdToken));
        emit PoolImplementationUpdated(poolImplementation, newImpl);
        poolImplementation = newImpl;
    }

    function createMeme(
        string memory name,
        string memory symbol,
        string memory imageURI,
        string memory description,
        uint256 devBuyUSD,
        bytes32 tokenSalt
    ) external returns (address token, address sale) {
        if (poolImplementation == address(0)) revert NoPoolImplementation();
        TokenSale newSale = new TokenSale(address(0), usdToken, feeRecipient);
        MemeToken newToken = new MemeToken{salt: tokenSalt}(name, symbol, imageURI, description, msg.sender, address(newSale));
        newSale.setToken(address(newToken));
        newSale.setPoolImplementation(poolImplementation);
        newSale.setFeeRecipient(feeRecipient);
        token = address(newToken);
        sale  = address(newSale);
        allTokens.push(token);
        tokenToSale[token] = sale;
        creatorTokens[msg.sender].push(token);
        if (devBuyUSD > 0) {
            IERC20Approve(usdToken).transferFrom(msg.sender, address(newSale), devBuyUSD);
            newSale.devBuy(msg.sender, devBuyUSD);
        }
        emit MemeCreated(token, sale, msg.sender, name, symbol, imageURI, devBuyUSD);
    }

    function deployPool(address token) external returns (address pool) {
        address sale = tokenToSale[token];
        if (sale == address(0)) revert ZeroAddress();
        if (msg.sender != sale) revert NotSale();
        if (tokenToPool[token] != address(0)) revert PoolAlreadyDeployed();
        address impl = TokenSale(sale).poolImplementation();
        pool = _clone(impl);
        LiquidityPool(pool).initClone(address(this), usdToken);
        LiquidityPool(pool).setToken(token);
        LiquidityPool(pool).setSale(sale);
        LiquidityPool(pool).setFeeRecipient(feeRecipient);
        tokenToPool[token] = pool;
        emit PoolDeployed(token, pool);
    }

    function _clone(address impl) internal returns (address instance) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, impl))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "Clone failed");
    }

    function getAllTokens() external view returns (address[] memory) { return allTokens; }
    function getTokenCount() external view returns (uint256) { return allTokens.length; }
    function getCreatorTokens(address creator) external view returns (address[] memory) { return creatorTokens[creator]; }

    function setFeeRecipient(address _feeRecipient) external {
        if (msg.sender != owner) revert NotOwner();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = _feeRecipient;
    }
}


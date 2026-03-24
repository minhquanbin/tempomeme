// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MemeToken {
    string public name;
    string public symbol;
    string public imageURI;
    string public description;
    address public creator;
    address public saleContract;

    uint8 public constant decimals = 18;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    error InsufficientBalance();
    error InsufficientAllowance();

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _imageURI,
        string memory _description,
        address _creator,
        address _saleContract
    ) {
        name         = _name;
        symbol       = _symbol;
        imageURI     = _imageURI;
        description  = _description;
        creator      = _creator;
        saleContract = _saleContract;
        totalSupply  = TOTAL_SUPPLY;
        balanceOf[_saleContract] = TOTAL_SUPPLY;
        emit Transfer(address(0), _saleContract, TOTAL_SUPPLY);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        if (allowance[from][msg.sender] < amount) revert InsufficientAllowance();
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

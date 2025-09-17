// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NeuralGridToken
 * @notice Simple ERC20-compatible token for rewards (NGR)
 * @dev Minimal implementation to avoid external deps for now
 */
contract NeuralGridToken {
    string public name = "NeuralGrid Token";
    string public symbol = "NGR";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        _mint(msg.sender, _initialSupply);
    }

    function transfer(address _to, uint256 _value) external returns (bool) {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) external returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) external returns (bool) {
        uint256 currentAllowance = allowance[_from][msg.sender];
        require(currentAllowance >= _value, "Allowance exceeded");
        allowance[_from][msg.sender] = currentAllowance - _value;
        _transfer(_from, _to, _value);
        return true;
    }

    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function _mint(address _to, uint256 _amount) internal {
        totalSupply += _amount;
        balanceOf[_to] += _amount;
        emit Transfer(address(0), _to, _amount);
    }

    function _transfer(address _from, address _to, uint256 _value) internal {
        require(_to != address(0), "Zero address");
        require(balanceOf[_from] >= _value, "Insufficient balance");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(_from, _to, _value);
    }
}
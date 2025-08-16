// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GoldNestGold is ERC20, Ownable {
    // The constructor sets the Token Name ("GoldNest Gold"), Symbol ("GNG"), and the contract owner.
    constructor() ERC20("GoldNest Gold", "GNG") Ownable(msg.sender) {}

    // This is the function our backend will call to create new tokens for users.
    // The "onlyOwner" modifier ensures only our secure backend wallet can mint tokens.
    function mint(address to, uint256 amount) public onlyOwner {
        // We use 18 decimals by default for ERC20 tokens.
        // Our backend will calculate the correct amount to send (e.g., 0.5 grams -> 0.5 * 10**18).
        _mint(to, amount);
    }
}
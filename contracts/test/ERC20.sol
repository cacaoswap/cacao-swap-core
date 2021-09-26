pragma solidity =0.5.16;

import '../CacaoERC20.sol';

contract ERC20 is CacaoERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}

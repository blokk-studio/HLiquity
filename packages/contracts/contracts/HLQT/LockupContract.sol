// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "../Dependencies/SafeMath.sol";
import "../Interfaces/IHLQTToken.sol";
import "../Dependencies/BaseHST.sol";

/*
* The lockup contract architecture utilizes a single LockupContract, with an unlockTime. The unlockTime is passed as an argument 
* to the LockupContract's constructor. The contract's balance can be withdrawn by the beneficiary when block.timestamp > unlockTime. 
* At construction, the contract checks that unlockTime is at least one year later than the Liquity system's deployment time. 

* Within the first year from deployment, the deployer of the LQTYToken (Liquity AG's address) may transfer HLQT only to valid
* LockupContracts, and no other addresses (this is enforced in LQTYToken.sol's transfer() function).
* 
* The above two restrictions ensure that until one year after system deployment, HLQT tokens originating from Liquity AG cannot
* enter circulating supply and cannot be staked to earn system revenue.
*/
contract LockupContract is BaseHST {
    using SafeMath for uint;
    // --- Data ---
    string constant public NAME = "LockupContract";

    uint constant public SECONDS_IN_ONE_YEAR = 31536000; 

    address public immutable beneficiary;

    IHLQTToken public hlqtToken;

    // Unlock time is the Unix point in time at which the beneficiary can withdraw.
    uint public unlockTime;

    // --- Events ---

    event LockupContractCreated(address _beneficiary, uint _unlockTime);
    event LockupContractEmptied(uint _LQTYwithdrawal);

    // --- Functions ---

    constructor 
    (
        address _hlqtTokenAddress,
        address _beneficiary, 
        uint _unlockTime
    )
        public 
    {
        hlqtToken = IHLQTToken(_hlqtTokenAddress);

        _associateToken(address(this), hlqtToken.getTokenAddress());

        /*
        * Set the unlock time to a chosen instant in the future, as long as it is at least 1 year after
        * the system was deployed 
        */
        _requireUnlockTimeIsAtLeastOneYearAfterSystemDeployment(_unlockTime);
        unlockTime = _unlockTime;
        
        beneficiary =  _beneficiary;
        emit LockupContractCreated(_beneficiary, _unlockTime);
    }

    function withdrawHLQT() external {
        _requireCallerIsBeneficiary();
        _requireLockupDurationHasPassed();

        IHLQTToken hlqtTokenCached = hlqtToken;
        uint LQTYBalance = hlqtTokenCached.balanceOf(address(this));

        _transfer(hlqtToken.getTokenAddress(), address(this), beneficiary, LQTYBalance);
        emit LockupContractEmptied(LQTYBalance);
    }

    // --- 'require' functions ---

    function _requireCallerIsBeneficiary() internal view {
        require(msg.sender == beneficiary, "LockupContract: caller is not the beneficiary");
    }

    function _requireLockupDurationHasPassed() internal view {
        require(block.timestamp >= unlockTime, "LockupContract: The lockup duration must have passed");
    }

    function _requireUnlockTimeIsAtLeastOneYearAfterSystemDeployment(uint _unlockTime) internal view {
        uint systemDeploymentTime = hlqtToken.getDeploymentStartTime();
        require(_unlockTime >= systemDeploymentTime.add(SECONDS_IN_ONE_YEAR), "LockupContract: unlock time must be at least one year after system deployment");
    }
}

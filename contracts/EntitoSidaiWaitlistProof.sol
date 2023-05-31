// SPDX-License-Identifier: MIT

/**
 * @title EntitoSidai Waitlist Proof
 * @author @sidaiLabs
 * @notice Paying the gas fee to join the waitlist is proof of genuine interest in the 
 *         project and helps ensure that only serious participants can mint in the private sale.
 *         This helps prevent the waitlist, which has limited seats,from being filled with 
 *         non-serious participants.
 */
pragma solidity ^0.8.4;
 
 import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract EntitoSidaiWaitlistProof
is
ReentrancyGuard
 {

     //WaitList
    mapping(address => bool) public waitlisted;
    uint256 public constant MAX_WAITLIST_SEATS = 4;
    uint256 public seatsFilled;


    /// @notice Checks that the user is waitlisted.
    modifier isWaitlisted(address account) {
        require(waitlisted[account], "Not on the waitlist");
        _;
    }

    /**
     * @notice Join the waitlist.
     */
    function joinWaitlist() public nonReentrant {
        require(seatsFilled < MAX_WAITLIST_SEATS, "Waitlist is full");
        require(!waitlisted[msg.sender], "Already on the waitlist");

        waitlisted[msg.sender] = true;
        seatsFilled++;
    }


 }
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {IERC721A, ERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";
import {OperatorFilterer} from "./OperatorFilterer.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC2981, ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// dev
error InvalidPhase();
error AddressCannotBeZero();
error ETHTransferFail();
// mint
error ExceedsMaxSupply();
error ExceedsMaxPerWallet();
error MintIsNotOpen();
error CallerIsAContract();
error IncorrectETHSent();
error Unauthorized();

/// @title EntitoSidai NFT Contract
/// @author @SidaiLabs
/// @dev Based off ERC-721A for gas optimised batch mints

contract EntitoSidai is
    ERC721AQueryable,
    OperatorFilterer,
    ReentrancyGuard,
    Ownable,
    ERC2981
{
    using ECDSA for bytes32;

    enum Phases {
        CLOSED,
        WAITLIST,
        PUBLIC,
        COMPLETE
    }

    // Mint Information
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_PER_WALLET = 2;
    uint256 public WL_MINT_PRICE = 0.075 ether;
    uint256 public PUBLIC_MINT_PRICE = 0.1 ether;
    uint8 public phase;

    //WaitList
    mapping(address => bool) public waitlisted;
     uint256 public constant MAX_WAITLIST_SEATS = 250;
    uint256 public seatsFilled;
   

    // General
    string private _baseTokenURI;
    bool public operatorFilteringEnabled;

    // Events
    event UpdateBaseURI(string baseURI);
    event UpdateSalePhase(uint256 index);
    event UpdateWaitlistMintPrice(uint256 _price);
    event UpdatePublicMintPrice(uint256 _price);
    

    constructor() ERC721A("EntitoSidai", "ESIDAI") {
        //ownerFund = payable(msg.sender);
        _registerForOperatorFiltering();
        operatorFilteringEnabled = true;
        _setDefaultRoyalty(msg.sender, 250);
    }

    //===============================================================
    //                    Modifiers
    //===============================================================

    /// @notice Checks that the user sent the correct amount of ETH.
    modifier isCorrectEthWaitlist(uint256 _quantity) {
        if (msg.value < WL_MINT_PRICE * _quantity) revert IncorrectETHSent();
        _;
    }

    /// @notice Checks that the user sent the correct amount of ETH.
    modifier isCorrectEthPublic(uint256 _quantity) {
        if (msg.value < PUBLIC_MINT_PRICE * _quantity) revert IncorrectETHSent();
        _;
    }

    /// @notice Checks that the quantity to mint does not exceed the max quantity per wallet.
    modifier isBelowOrEqualsMaxPerWallet(uint256 _quantity) {
        if (_numberMinted(msg.sender) + _quantity > MAX_PER_WALLET)
            revert ExceedsMaxPerWallet();
        _;
    }

    /// @notice Checks that the quantity to mint does not exceed the max supply.
    modifier isBelowOrEqualsMaxSupply(uint256 _quantity) {
        if ((_totalMinted() + _quantity) > MAX_SUPPLY)
            revert ExceedsMaxSupply();
        _;
    }

    /// @notice Checks that the mint phase is open.
    modifier isMintOpen(Phases ps) {
        if (uint8(ps) != phase) revert MintIsNotOpen();
        _;
    }

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

    //===============================================================
    //                    Minting Functions
    //===============================================================

    /// @notice This function allows waitlisted users to mint during the waitlist phase.
    function waitlistMint(
        uint256 _quantity
    )
        external
        payable
        nonReentrant
        isMintOpen(Phases.WAITLIST)
        isWaitlisted(msg.sender)
        isCorrectEthWaitlist(_quantity)
        isBelowOrEqualsMaxPerWallet(_quantity)
        isBelowOrEqualsMaxSupply(_quantity)
    {
        _mint(msg.sender, _quantity);
    }

    /// @notice This function allows users to mint during the PUBLIC phase.
    function publicMint(
        uint256 _quantity
    )
        external
        payable
        nonReentrant
        isMintOpen(Phases.PUBLIC)
        isCorrectEthPublic(_quantity)
        isBelowOrEqualsMaxPerWallet(_quantity)
        isBelowOrEqualsMaxSupply(_quantity)
    {
        _mint(msg.sender, _quantity);
    }

    /// @notice This function allows the owner to mint reserved NFTs.
    function ownerMint(
        address _to,
        uint256 _quantity
    ) external onlyOwner isBelowOrEqualsMaxSupply(_quantity) {
        _mint(_to, _quantity);
    }

    //===============================================================
    //                    Setter Functions
    //===============================================================

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit UpdateBaseURI(baseURI);
    }

    function setPhase(uint256 index) external onlyOwner {
        if (index == 0) {
            phase = uint8(Phases.CLOSED);
        } else if (index == 1) {
            phase = uint8(Phases.WAITLIST);
        } else if (index == 2) {
            phase = uint8(Phases.PUBLIC);
        } else if (index == 3) {
            phase = uint8(Phases.COMPLETE);
        } else {
            revert InvalidPhase();
        }
        emit UpdateSalePhase(index);
    }

    function setWaitlistPrice(uint256 _price) external onlyOwner {
        WL_MINT_PRICE = _price;
        emit UpdateWaitlistMintPrice(_price);
    }

    function setPublicPrice(uint256 _price) external onlyOwner {
        PUBLIC_MINT_PRICE = _price;
        emit UpdatePublicMintPrice(_price);
    }

    //===============================================================
    //                    Getter Functions
    //===============================================================

    function getNumberMinted(address _address) external view returns (uint256) {
        return _numberMinted(_address);
    }

    //===============================================================
    //                    ETH Withdrawal
    //===============================================================

    function withdraw() external onlyOwner nonReentrant {
        uint256 currentBalance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: currentBalance}("");
        if (!success) revert ETHTransferFail();
    }

    //===============================================================
    //                      Token Data
    //===============================================================

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    //===============================================================
    //                    Royalty Enforcement
    //===============================================================

    function setApprovalForAll(
        address operator,
        bool approved
    ) public override(IERC721A, ERC721A) onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    function approve(
        address operator,
        uint256 tokenId
    )
        public
        payable
        override(IERC721A, ERC721A)
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override(IERC721A, ERC721A) onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override(IERC721A, ERC721A) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public payable override(IERC721A, ERC721A) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function setOperatorFilteringEnabled(bool value) public onlyOwner {
        operatorFilteringEnabled = value;
    }

    function _operatorFilteringEnabled() internal view override returns (bool) {
        return operatorFilteringEnabled;
    }

    function _isPriorityOperator(
        address operator
    ) internal pure override returns (bool) {
        // OpenSea Seaport Conduit:
        // https://etherscan.io/address/0x1E0049783F008A0085193E00003D00cd54003c71
        // https://goerli.etherscan.io/address/0x1E0049783F008A0085193E00003D00cd54003c71
        return operator == address(0x1E0049783F008A0085193E00003D00cd54003c71);
    }

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    //===============================================================
    //                    SupportsInterface
    //===============================================================

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC721A, ERC721A, ERC2981) returns (bool) {
        // Supports the following `interfaceId`s:
        // - IERC165: 0x01ffc9a7
        // - IERC721: 0x80ac58cd
        // - IERC721Metadata: 0x5b5e139f
        // - IERC2981: 0x2a55205a
        return
            ERC721A.supportsInterface(interfaceId) ||
            ERC2981.supportsInterface(interfaceId);
    }
}

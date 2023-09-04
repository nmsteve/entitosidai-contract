// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {IERC721A, ERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC2981, ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// dev
error AddressCannotBeZero();
error ETHTransferFail();
// mint
error ExceedsMaxSupply();
error ExceedsMaxPerWallet();
error CallerIsAContract();
error IncorrectETHSent();
error Unauthorized();

/// @title EntitoSidai NFT Contract
/// @author @NJugi_Steve
/// @dev Based off ERC-721A for gas optimised batch mints

contract EntitoSidaiNFTs is
    ERC721AQueryable,
    ReentrancyGuard,
    Ownable,
    ERC2981
{
    // Mint Information
    uint256 public constant MAX_SUPPLY = 2000;
    uint256 public constant MAX_PER_WALLET = 1000;
    uint256 public PUBLIC_MINT_PRICE = 0.003 ether;

    // General
    string private _baseTokenURI;
    string public constant POLICYURI = 'https://ipfs.io/ipfs/bafkreif3iv35ssght6d24bzyq7mslxmrrlilgy2nbyohzop74hvluv5mqe';
    bool public minting = false;

    // Events
    event UpdateBaseURI(string baseURI);
    event UpdatePublicMintPrice(uint256 _price);

    constructor() ERC721A("EntitoSidaiNFTs", "ESNF") {
        
    }

    //===============================================================
    //                    Modifiers
    //===============================================================

    /// @notice Checks that the user sent the correct amount of ETH.
    modifier isCorrectEthPublic(uint256 _quantity) {
        if (msg.value < PUBLIC_MINT_PRICE * _quantity)
            revert IncorrectETHSent();
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

    /// @notice Checks that minting .
    modifier isMinting() {
        if (minting == false) revert Unauthorized();
        _;
    }

    //===============================================================
    //                    Setter Functions
    //===============================================================

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit UpdateBaseURI(baseURI);
    }

    function setPublicPrice(uint256 _price) external onlyOwner {
        PUBLIC_MINT_PRICE = _price;
        emit UpdatePublicMintPrice(_price);
    }

    function setMinting(bool state) external onlyOwner {
        minting = state;
    }

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    //===============================================================
    //                    Minting Functions
    //===============================================================

    /// @notice This function allows users to mint during the PUBLIC phase.
    function publicMint(
        uint256 _quantity
    )
        external
        payable
        nonReentrant
        isCorrectEthPublic(_quantity)
        isBelowOrEqualsMaxPerWallet(_quantity)
        isBelowOrEqualsMaxSupply(_quantity)
        isMinting
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
    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(uint256 tokenId) public view virtual override(ERC721A, IERC721A) returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        string memory baseURI = _baseURI();
        return bytes(baseURI).length != 0 ? string(abi.encodePacked(baseURI, _toString(tokenId),'.json')) : '';
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

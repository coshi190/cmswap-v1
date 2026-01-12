// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {TBridgeV2} from "../src/TBridgeV2.sol";
import {TBridgeTokenRegistry} from "../src/TBridgeTokenRegistry.sol";
import {TBridgeVault} from "../src/TBridgeVault.sol";
import {TBridgeFeeCollector} from "../src/TBridgeFeeCollector.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeployTBridge
/// @notice Deployment script for tBridge-v2 contracts
/// @dev Run with: forge script script/DeployTBridge.s.sol --rpc-url $RPC_URL --broadcast
contract DeployTBridge is Script {
    // ============ Chain Configuration ============

    // Chain IDs
    uint256 public constant KUB_CHAIN_ID = 96;
    uint256 public constant JBC_CHAIN_ID = 8081;
    uint256 public constant BSC_CHAIN_ID = 56;

    // USDT Addresses per chain
    address public constant KUSDT = 0x7d984C24d2499D840eB3b7016077164e15E5faA6;
    address public constant JUSDT = 0xFD8Ef75c1cB00A594D02df48ADdc27414Bd07F8a;
    address public constant BSC_USDT = 0x55d398326f99059fF775485246999027B3197955;

    // Default limits for USDT
    uint256 public constant MIN_AMOUNT = 1e18; // 1 USDT
    uint256 public constant MAX_AMOUNT = 1_000_000e18; // 1M USDT
    uint256 public constant DAILY_LIMIT = 100_000e18; // 100K USDT per user

    // ============ Deployment ============

    function run() external {
        // Load environment variables
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address relayer = vm.envAddress("RELAYER_ADDRESS");

        console.log("Deploying tBridge-v2 on chain:", block.chainid);
        console.log("Treasury:", treasury);
        console.log("Relayer:", relayer);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Deploy all contracts
        (
            address feeCollectorAddr,
            address registryAddr,
            address vaultAddr,
            address bridgeAddr
        ) = _deployContracts(treasury, relayer);

        // Configure bridge
        _configureBridge(bridgeAddr, registryAddr, vaultAddr);

        vm.stopBroadcast();

        // Print deployment summary
        console.log("\n============ DEPLOYMENT SUMMARY ============");
        console.log("Chain ID:", block.chainid);
        console.log("FeeCollector:", feeCollectorAddr);
        console.log("TokenRegistry:", registryAddr);
        console.log("Vault:", vaultAddr);
        console.log("Bridge:", bridgeAddr);
        console.log("============================================\n");
    }

    function _deployContracts(address treasury, address relayer)
        internal
        returns (address feeCollectorAddr, address registryAddr, address vaultAddr, address bridgeAddr)
    {
        // 1. Deploy FeeCollector
        TBridgeFeeCollector feeCollector = new TBridgeFeeCollector(treasury);
        feeCollectorAddr = address(feeCollector);
        console.log("FeeCollector deployed at:", feeCollectorAddr);

        // 2. Deploy TokenRegistry
        TBridgeTokenRegistry registryImpl = new TBridgeTokenRegistry();
        bytes memory registryInitData = abi.encodeCall(TBridgeTokenRegistry.initialize, ());
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInitData);
        registryAddr = address(registryProxy);
        console.log("TokenRegistry deployed at:", registryAddr);

        // 3. Deploy Vault with temporary bridge
        TBridgeVault vaultImpl = new TBridgeVault();
        bytes memory vaultInitData = abi.encodeCall(TBridgeVault.initialize, (address(1)));
        ERC1967Proxy vaultProxy = new ERC1967Proxy(address(vaultImpl), vaultInitData);
        vaultAddr = address(vaultProxy);
        console.log("Vault deployed at:", vaultAddr);

        // 4. Deploy Bridge
        TBridgeV2 bridgeImpl = new TBridgeV2();
        bytes memory bridgeInitData = abi.encodeCall(
            TBridgeV2.initialize, (block.chainid, registryAddr, vaultAddr, feeCollectorAddr, relayer)
        );
        ERC1967Proxy bridgeProxy = new ERC1967Proxy(address(bridgeImpl), bridgeInitData);
        bridgeAddr = address(bridgeProxy);
        console.log("Bridge deployed at:", bridgeAddr);

        // 5. Update Vault with correct bridge
        TBridgeVault(vaultAddr).setBridge(bridgeAddr);
        console.log("Vault bridge address updated");
    }

    function _configureBridge(address bridgeAddr, address registryAddr, address) internal {
        TBridgeV2 bridge = TBridgeV2(bridgeAddr);
        TBridgeTokenRegistry registry = TBridgeTokenRegistry(registryAddr);
        uint256 currentChain = block.chainid;

        // Configure supported chains
        if (currentChain != KUB_CHAIN_ID) {
            bridge.setSupportedChain(KUB_CHAIN_ID, true);
            console.log("Added KUB chain support");
        }
        if (currentChain != JBC_CHAIN_ID) {
            bridge.setSupportedChain(JBC_CHAIN_ID, true);
            console.log("Added JBC chain support");
        }
        if (currentChain != BSC_CHAIN_ID) {
            bridge.setSupportedChain(BSC_CHAIN_ID, true);
            console.log("Added BSC chain support");
        }

        // Register USDT
        address localUsdt = _getLocalUsdt(currentChain);
        if (localUsdt != address(0)) {
            (uint256 remoteChain1, address remoteToken1) = _getFirstRemoteUsdt(currentChain);
            registry.registerToken(localUsdt, remoteChain1, remoteToken1, MIN_AMOUNT, MAX_AMOUNT, DAILY_LIMIT);
            console.log("Registered USDT:", localUsdt);

            (uint256 remoteChain2, address remoteToken2) = _getSecondRemoteUsdt(currentChain);
            if (remoteChain2 != 0) {
                registry.addRemoteToken(localUsdt, remoteChain2, remoteToken2);
            }
        }
    }

    // ============ Helper Functions ============

    function _getLocalUsdt(uint256 chainId) internal pure returns (address) {
        if (chainId == KUB_CHAIN_ID) return KUSDT;
        if (chainId == JBC_CHAIN_ID) return JUSDT;
        if (chainId == BSC_CHAIN_ID) return BSC_USDT;
        return address(0);
    }

    function _getFirstRemoteUsdt(uint256 chainId) internal pure returns (uint256, address) {
        if (chainId == KUB_CHAIN_ID) return (JBC_CHAIN_ID, JUSDT);
        if (chainId == JBC_CHAIN_ID) return (KUB_CHAIN_ID, KUSDT);
        if (chainId == BSC_CHAIN_ID) return (KUB_CHAIN_ID, KUSDT);
        return (0, address(0));
    }

    function _getSecondRemoteUsdt(uint256 chainId) internal pure returns (uint256, address) {
        if (chainId == KUB_CHAIN_ID) return (BSC_CHAIN_ID, BSC_USDT);
        if (chainId == JBC_CHAIN_ID) return (BSC_CHAIN_ID, BSC_USDT);
        if (chainId == BSC_CHAIN_ID) return (JBC_CHAIN_ID, JUSDT);
        return (0, address(0));
    }
}

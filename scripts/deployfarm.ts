// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const kDAI = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const [deployer] = await ethers.getSigners();

  // const MockDai = await ethers.getContractFactory('MockERC20');
  // const mockDai = await MockDai.deploy(1000000);
  // console.log('mockDai address: ' + mockDai.address);

  const RealToken = await ethers.getContractFactory("RealToken");
  const realToken = await RealToken.deploy(1000000);
  console.log('realToken address: ' + realToken.address);

  const RealFarm = await ethers.getContractFactory("RealFarm");
  const realFarm = await RealFarm.deploy(kDAI, realToken.address);
  console.log('realFarm address: ' + realFarm.address);

  await realToken.transferOwnership(realFarm.address);
  console.log('realToken ownership transferred to :' + realFarm.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

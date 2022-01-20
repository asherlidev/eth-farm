import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { time } from "@openzeppelin/test-helpers";


describe("realFarm", () => {
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let res: any;
    let realFarm: Contract;
    let realToken: Contract;
    let mockDai: Contract;

    const daiAmount: BigNumber = ethers.utils.parseEther('25000');

    beforeEach(async() => {
        const RealFarm = await ethers.getContractFactory('RealFarm');
        const RealToken = await ethers.getContractFactory('RealToken');
        const MockDai = await ethers.getContractFactory('MockERC20');
    
        mockDai = await MockDai.deploy("MockDai", 'mDai');
        [owner, alice, bob] = await ethers.getSigners();
        await Promise.all([
            mockDai.mint(owner.address, daiAmount),
            mockDai.mint(alice.address, daiAmount),
            mockDai.mint(bob.address, daiAmount)
        ]);

        realToken = await RealToken.deploy();
        realFarm = await RealFarm.deploy(mockDai.address, realToken.address);
    })
})

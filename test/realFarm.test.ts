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

    const daiAmount: BigNumber = ethers.utils.parseEther('200');

    beforeEach(async() => {
        const RealFarm = await ethers.getContractFactory('RealFarm');
        const RealToken = await ethers.getContractFactory('RealToken');
        const MockDai = await ethers.getContractFactory('MockERC20');
    
        mockDai = await MockDai.deploy(100000000);
        [owner, alice, bob] = await ethers.getSigners();
        await Promise.all([
            mockDai.mint(owner.address, daiAmount),
            mockDai.mint(alice.address, daiAmount),
            mockDai.mint(bob.address, daiAmount)
        ]);

        realToken = await RealToken.deploy(25000000);
        realFarm = await RealFarm.deploy(mockDai.address, realToken.address);
    })

    describe("Init", async() => {
        it("should initialize", async() => {
            expect(realToken).to.be.ok
            expect(mockDai).to.be.ok
            expect(realFarm).to.be.ok
        })
    })

    describe("Stake", async() => {
        it("shoud accept DAI and update mapping", async() => {
            let toTransfer: BigNumber = ethers.utils.parseEther("100");
            await mockDai.connect(alice).approve(realFarm.address, toTransfer);

            expect(await realFarm.isStaking(alice.address)).to.eq(false)

            expect(await realFarm.connect(alice).stake(toTransfer)).to.be.ok

            expect(await realFarm.daiTokenBalance(alice.address)).to.deep.equal(toTransfer);

            expect(await realFarm.isStaking(alice.address)).to.eq(true)
        })
    })
})

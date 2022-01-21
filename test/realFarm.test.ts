import { expect, use } from "chai";
import { ethers } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { solidity } from "ethereum-waffle";
// import { time } from "@openzeppelin/test-helpers";
use(solidity);

describe("realFarm", () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let res: any;
  let realFarm: Contract;
  let realToken: Contract;
  let mockDai: Contract;

  const daiAmount: BigNumber = ethers.utils.parseEther("200");

  beforeEach(async () => {
    const RealFarm = await ethers.getContractFactory("RealFarm");
    const RealToken = await ethers.getContractFactory("RealToken");
    const MockDai = await ethers.getContractFactory("MockERC20");

    mockDai = await MockDai.deploy(100000000);
    [owner, alice, bob] = await ethers.getSigners();
    await Promise.all([
      mockDai.mint(owner.address, daiAmount),
      mockDai.mint(alice.address, daiAmount),
      mockDai.mint(bob.address, daiAmount),
    ]);

    realToken = await RealToken.deploy(25000000);
    realFarm = await RealFarm.deploy(mockDai.address, realToken.address);
  });

  describe("Init", async () => {
    it("should initialize", async () => {
      expect(realToken).to.be.ok;
      expect(mockDai).to.be.ok;
      expect(realFarm).to.be.ok;
    });
  });

  describe("Stake", async () => {
    it("shoud accept DAI and update mapping", async () => {
      let toTransfer: BigNumber = ethers.utils.parseEther("100");
      await mockDai.connect(alice).approve(realFarm.address, toTransfer);

      expect(await realFarm.isStaking(alice.address)).to.eq(false);

      expect(await realFarm.connect(alice).stake(toTransfer)).to.be.ok;

      expect(await realFarm.daiTokenBalance(alice.address)).to.deep.equal(
        toTransfer
      );

      expect(await realFarm.isStaking(alice.address)).to.eq(true);
    });

    it("should update balance with muliple stakes", async () => {
      let toTransfer = ethers.utils.parseEther("100");
      await mockDai.connect(alice).approve(realFarm.address, toTransfer);
      await realFarm.connect(alice).stake(toTransfer);

      await mockDai.connect(alice).approve(realFarm.address, toTransfer);
      await realFarm.connect(alice).stake(toTransfer);

      expect(await realFarm.daiTokenBalance(alice.address)).to.deep.equal(
        ethers.utils.parseEther("200")
      );
    });

    it("should revert with not enough funds", async () => {
      let toTransfer = ethers.utils.parseEther("100000");
      await mockDai.connect(bob).approve(realFarm.address, toTransfer);
      await expect(realFarm.connect(bob).stake(toTransfer)).to.be.revertedWith(
        "Your balance is less that the amount you want to stake"
      );
    });
  });

  describe("Unstake", async () => {
    beforeEach(async () => {
      let toTransfer = ethers.utils.parseEther("100");
      await mockDai.connect(alice).approve(realFarm.address, toTransfer);
      await realFarm.connect(alice).stake(toTransfer);
    });

    it("should unstake balance from user", async () => {
      let toTransfer = ethers.utils.parseEther("100");
      await realFarm.connect(alice).unstake(toTransfer);

      res = await realFarm.daiTokenBalance(alice.address);
      expect(Number(res)).to.eq(0);

      expect(await realFarm.isStaking(alice.address)).to.eq(false);
    });
  });

  describe("WithdrawYield", async () => {
    beforeEach(async () => {
      await realToken._transferOwnership(realFarm.address);
      let toTransfer = ethers.utils.parseEther("10");
      await mockDai.connect(alice).approve(realFarm.address, toTransfer);
      await realFarm.connect(alice).stake(toTransfer);
    });

    // it("should return correct yield time", async () => {
    //   let timeStart = await realFarm.startTime(alice.address);
    //   expect(Number(timeStart)).to.be.greaterThan(0);

    //   // Fast-forward time
    //   await time.increase(86400);

    //   expect(await realFarm.calculateYieldTime(alice.address)).to.eq(86400);
    // });

    // it("should mint correct token amount in total supply and user", async () => {
    //   await time.increase(86400);

    //   let _time = await realFarm.calculateYieldTime(alice.address);
    //   let formatTime = _time / 86400;
    //   let staked = await realFarm.stakingBalance(alice.address);
    //   let bal = staked * formatTime;
    //   let newBal = ethers.utils.formatEther(bal.toString());
    //   let expected = Number.parseFloat(newBal).toFixed(3);

    //   await realFarm.connect(alice).withdrawYield();

    //   res = await realToken.totalSupply();
    //   let newRes = ethers.utils.formatEther(res);
    //   let formatRes = Number.parseFloat(newRes).toFixed(3).toString();

    //   expect(expected).to.eq(formatRes);

    //   res = await realToken.balanceOf(alice.address);
    //   newRes = ethers.utils.formatEther(res);
    //   formatRes = Number.parseFloat(newRes).toFixed(3).toString();

    //   expect(expected).to.eq(formatRes);
    // });

    // it("should update yield balance when unstaked", async () => {
    //   await time.increase(86400);
    //   await realFarm.connect(alice).unstake(ethers.utils.parseEther("5"));

    //   res = await realFarm.pmknBalance(alice.address);
    //   expect(Number(ethers.utils.formatEther(res))).to.be.approximately(
    //     10,
    //     0.001
    //   );
    // });
  });
});

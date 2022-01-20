pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RealToken.sol";

contract RealFarm {
    
    //the amount of daiTokens which user have staked.
    mapping(address => uint256) public daiTokenBalance;

    //the start time when user started to stake.
    mapping(address => uint256) public startTime;

    //the state whether user is staking or not.
    mapping(address => bool) public isStaking;

    //the amount of realToken
    mapping(address => uint256) public realTokenBalance;

    //(the base token for calculating the real token)
    IERC20 public daiToken;
    //(custom token which we just create)
    RealToken public realToken;

    event Stake(address indexed from, uint256 amount);
    event Unstake(address indexed from, uint256 amount);
    event YieldWithdraw(address indexed to, uint256 amount);

    constructor(IERC20 _daiToken, RealToken _realToken) {
        daiToken = _daiToken;
        realToken = _realToken;
    }

    /**
    ** 1. add the base token to the pool(in this case, DaiToken) 
    ** 2. calculate the amount of the generate RealToken by staking
    ** 3. reset the start time of staking to this time.
    ** 4. issue the Stake event for the record
    **/
    function stake(uint256 amount) public {
        require(amount > 0 , "You cannot stake zero token");
        require(daiToken.balanceOf(msg.sender) >= amount, "Your balance is less that the amount you want to stake");
        
        if (isStaking[msg.sender]) {
            //calculate the amount of the generate RealToken by staking
            uint256 toTransfer = calculateYieldRealTokenTotal(msg.sender);
            realTokenBalance[msg.sender] += toTransfer;
        }
        
        // add the base token to the pool
        daiToken.transferFrom(msg.sender, address(this), amount); 
        daiTokenBalance[msg.sender] += amount;
        //re-start the staking
        startTime[msg.sender] = block.timestamp;
        isStaking[msg.sender] = true; 
        emit Stake(msg.sender, amount);
    }

    /** 
    ** 1. calculate the amount of the generate RealToken by staking
    ** 2. subtract the base token to the pool(in this case, DaiToken) 
    ** 3. re-set the staking time to this time. 
    ** 4. issue the Unstake event for the record
    **/
    function unstake(uint256 amount) public {
        require(isStaking[msg.sender] == true && daiTokenBalance[msg.sender] >= amount, "You can't unstake");

        //1. calculate the amount of the generate RealToken by staking
        uint256 yieldedRealToken = calculateYieldRealTokenTotal(msg.sender);//the gererated amount of the realToken by staking.
        uint256 daiTokenAmount = amount;// the amount of daiToken which need to subtract from daiTokenBalance.
        amount = 0;

        //2. subtract the base token to the pool(in this case, DaiToken) 
        daiToken.transfer(msg.sender, daiTokenAmount);
        daiTokenBalance[msg.sender] -= daiTokenAmount;
        realTokenBalance[msg.sender] += yieldedRealToken;
        if (daiTokenBalance[msg.sender] == 0) {
            isStaking[msg.sender] = false;
        }
        startTime[msg.sender] = block.timestamp;
        emit Unstake(msg.sender, daiTokenAmount);
    }

    /** 
    ** 1. calculate the amount of the generate RealToken by staking.
    ** 2. withdraw the realToken to the account from pool.
    **/
    function yieldWithdraw() public {
        uint256 yieldedRealToken = calculateYieldRealTokenTotal(msg.sender);

        require(yieldedRealToken > 0 || realTokenBalance[msg.sender] > 0, "You can't withdraw from zero token");

        if (realTokenBalance[msg.sender] != 0) {
            uint256 balance = realTokenBalance[msg.sender];
            realTokenBalance[msg.sender] = 0;
            yieldedRealToken += balance;
        }

        realToken.mint(msg.sender, yieldedRealToken);
        startTime[msg.sender] = block.timestamp;
        emit YieldWithdraw(msg.sender, yieldedRealToken);
    }
    
    /** 
    ** calculate the staked realToken amount.
    **/
    function calculateYieldRealTokenTotal(address from) private view returns(uint256) {
        uint256 time = calculateYieldTime(from) * 10**18;
        uint256 rate = 86400;
        uint256 timeRate = time / rate;
        uint256 rawYield = (daiTokenBalance[from] * timeRate) / 10**18;
        return rawYield;
    }

    /** 
    ** calculate the staking time.
    **/
    function calculateYieldTime(address user) public view returns(uint256) {
        uint256 end = block.timestamp;
        uint256 time = end - startTime[user];
        return time;
    }

}

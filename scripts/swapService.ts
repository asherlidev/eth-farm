import { Web3Provider } from "@ethersproject/providers";
import { BigNumber } from "ethers";
import { getKeyByValue } from "helpers/array";
import { message } from "antd";
const ethers = require("ethers");

export function encodePath(path: string[], fees: Number[]): string {
  if (path.length != fees.length + 1) {
    throw new Error('path/fee lengths do not match')
  }

  let encoded = '0x';
  for (let i = 0; i < fees.length; i++) {
    // 20 byte encoding of the address
    encoded += path[i].slice(2)
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * 3, '0')
  }
  // encode the final token
  encoded += path[path.length - 1].slice(2)

  return encoded.toLowerCase()
}


interface ExactInputParams {
  path: any;
  recipient: string | any;
  deadline: Number;
  amountIn: Number;
  amountOutMinimum: Number;
}

class SwapService {
  private _web3Provider: any;
  private _web3Library: any;

  constructor(web3Provider: any) {
    this._web3Provider = web3Provider;

    this.pancakeSwap = this.pancakeSwap.bind(this);
  }

  getWeb3APIProvider = () => {
    return this._web3Provider;
  };

  async pancakeSwap(
    privateKey: any,
    // addresses: any,
    swapInfo: any,
    pair: any,
    amount: string,
    slippage: number,
    provider: any,
    callback: Function,
    recipient: string,
    sqrtPriceLimitX96?: number,
  ) {
    try {
      console.log({swapInfo})
      const web3Provider = this.getWeb3APIProvider();

      let wallet = new ethers.Wallet(privateKey, web3Provider);

      const account = wallet.connect(web3Provider);

      const router = new ethers.Contract(
        // addresses.router,
        swapInfo.router,
        [
        //   "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
        //   "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint[] memory amounts)",
        //   "function swapETHForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline) external payable returns (uint[] memory amounts)",
        //   "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",

          "function exactInputSingle(struct ISwapRouter.ExactInputSingleParams params) external returns (uint256 amountOut)",
        ],
        wallet
      );

      const path = await this.getPairInfo(wallet, pair);

      if(path) {
        const gas = {
          gasPrice: ethers.utils.parseUnits("50", "gwei"),
          gasLimit: "300000",
        };
  
        const amountIn = ethers.utils.parseUnits(amount, swapInfo.From?.decimals);
  
        const MAX_LP = ethers.utils.parseUnits('10000000000', 18);
  
        const approveToken = new ethers.Contract(
          pair[0],
          [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
          ],
          account
        );
  
        const rate = await this.getExchangeRate(
          wallet,
          {
            From: swapInfo.From?.address,
            To: swapInfo.To?.address,
            router: swapInfo.router,
          },
          amountIn,
          path,
          slippage,
          provider
        );

        const adjustedOutMin = ethers.utils.parseUnits(rate, 18);
        
        const inputIsWETH9 = pair[0] === "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";//swap const variable
        const outputIsWETH9 = pair[1] === "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";//swap const variable

        const params = {
          tokenIn: pair[0],
          tokenOut: pair[1],
          fee: 3000,
          sqrtPriceLimitX96:
            sqrtPriceLimitX96 ?? amountIn.toLowerCase() < rate.toLowerCase()
              ? BigNumber.from('4295128740')
              : BigNumber.from('1461446703485210103287273052203988822378723970341'),
          recipient,
          deadline: 1,
          amountIn
        };

        if (!inputIsWETH9) {
          const tokenContract = new ethers.Contract(
            // addresses.router,
            pair[0],
            [
            //   "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
            //   "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint[] memory amounts)",
            //   "function swapETHForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline) external payable returns (uint[] memory amounts)",
            //   "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
    
              "function approve(spender, amount)",
            ],
            wallet
          );
          tokenContract.connect(recipient).approve(router.address, amountIn);
        }

        if (!outputIsWETH9) {
          const tokenContract = new ethers.Contract(
            // addresses.router,
            pair[1],
            [
            //   "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
            //   "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint[] memory amounts)",
            //   "function swapETHForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline) external payable returns (uint[] memory amounts)",
            //   "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
    
              "function approve(spender, amount)",
            ],
            wallet
          );
          tokenContract.connect(recipient).approve(router.address, rate);
        }
        
        let data = [router.interface.encodeFunctionData('exactInputSingle', [params])]
        if (outputIsWETH9)
          data.push(router.interface.encodeFunctionData('unwrapWETH9', [0, recipient]))
          
        // if(swapInfo.From?.symbol === 'WBNB' || swapInfo.From?.symbol === 'BNB') {
        //   console.log(`===========BNB To ${swapInfo.From.symbol} Token Swap=============`);
        //   const swapTxETHForExactTokens = await router.swapETHForExactTokens(
        //     adjustedOutMin,
        //     path,
        //     swapInfo.recipient,
        //     Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        //     {value: amountIn.toString()}
        //   );
  
        //   const receipt = await swapTxETHForExactTokens.wait();
        //   message.success("Swap done Successfully");
        //   console.log(`===========BNB To ${swapInfo.From.symbol} Token Swap Done=============`, swapTxETHForExactTokens.hash);
        //   callback(receipt);
        // } else {
        //   const allowance = await approveToken.allowance(wallet.address, swapInfo.router);
        //   if(allowance < amountIn) {
        //     const approveTx = await approveToken.approve(
        //       swapInfo.router,
        //       MAX_LP.toString(),
        //     );
        //     await approveTx.wait();
        //     console.log('===========Approve Done=============', approveTx.hash);
        //     message.success("Approve done Successfully");
        //   } 
          
        //   if (swapInfo.To?.symbol === 'WBNB' || swapInfo.To?.symbol === 'BNB') {
        //     console.log(`===========From ${swapInfo.From.symbol} Token To BNB Swap=============`);
        //     const swapTxExactTokensForETH = await router.swapExactTokensForETH(
        //       amountIn,
        //       adjustedOutMin,
        //       path,
        //       swapInfo.recipient,
        //       Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        //     );
  
        //     const receipt = await swapTxExactTokensForETH.wait();
        //     console.log(`===========From ${swapInfo.From.symbol} Token To BNB Swap Done=============`, swapTxExactTokensForETH.hash);
        //     message.success("Swap done Successfully");
        //     callback(receipt);
        //   } else {
        //     console.log(`===========From ${swapInfo.From.symbol} Token To ${swapInfo.To.symbol} Token Swap=============`);
        //     const swapTxExactTokensForTokens = await router.swapExactTokensForTokens(
        //       amountIn,
        //       adjustedOutMin,
        //       path,
        //       swapInfo.recipient,
        //       Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        //     );
  
        //     const receipt = await swapTxExactTokensForTokens.wait();
        //     console.log(`===========From ${swapInfo.From.symbol} Token To ${swapInfo.To.symbol} Token Swap Done=============`, swapTxExactTokensForTokens.hash);
        //     message.success("Swap done Successfully");
        //     callback(receipt);
        //   }
        // }
      } else {
        // alert('no liquidity on pancakeswap');
        console.log('no liquidity on pancakeswap');
        callback(false);
      }
    } catch (e) {
      console.log(e);
      callback(false);
    }
  }

  async getExchangeRate(
    wallet: any,
    addresses: any,
    amount: number,
    pair: any,
    slippage: number,
    provider: any
  ) {
    const router = new ethers.Contract(
      addresses.router,
      [
        // "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
        "function exactInput(struct ISwapRouter.ExactInputParams params) external returns (uint256 amountOut)"
      ],
      provider
    );

    let params: ExactInputParams = {
      path: encodePath(pair, new Array(pair.length - 1).fill(3000)),
      recipient: pair[1],
      deadline: 1000,
      amountIn: amount,
      amountOutMinimum: 0
    }

    const amountIn = ethers.utils.parseUnits(String(amount), 18);
    // const amounts = await router.getAmountsOut(amountIn, pair);
    const amounts = await router.exactInput(params);

    const slippageTolerance = (100 - slippage) / 100; //

    // create transaction parameters
    const currentOutMin = amounts[1].sub(amounts[1].div(10)) as BigNumber;
    const dec = ethers.utils.formatUnits(currentOutMin) * slippageTolerance;

    console.log("dec", dec);
    const adjustedOutMin: BigNumber = ethers.utils.parseUnits(dec.toString());

    const slippageFloat = parseFloat(ethers.utils.formatUnits(currentOutMin));

    // console.log("adjustedOutMin", adjustedOutMin);
    const amountOutMin = ethers.utils.formatUnits(adjustedOutMin);
    // console.log("amountOutMin", amountOutMin);

    // console.log(
    //   "Swapping",
    //   ethers.utils.formatUnits(amountIn),
    //   `${getKeyByValue(addresses, pair[0])} for `,
    //   ethers.utils.formatUnits(adjustedOutMin),
    //   `(${currentOutMin})`,
    //   `${getKeyByValue(addresses, pair[1])}`
    // );

    return amountOutMin;
  }

  async getPairInfo(wallet: any, pair: any) {
    const FACTORY = process.env.REACT_APP_PANCAKESWAP_FACTORY
    const factory = new ethers.Contract(
      FACTORY,
      [
        "function getPair(address tokenA, address tokenB, uint256 fee) external view returns (address pair)"
      ],
      wallet
    );

    const pairAddress = await factory.getPair(pair[0], pair[1], 3000);
    if(pairAddress === '0x0000000000000000000000000000000000000000') {
      const bnbToTokenPair = await factory.getPair("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", pair[1]);
      if(bnbToTokenPair !== '0x0000000000000000000000000000000000000000') {
        return [
          pair[0],
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          pair[1]
        ]
      } else 
        return null;
    } else 
      return pair;
  }

}

export { SwapService };
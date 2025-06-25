import { ethers } from "hardhat"
import { updateDeployedAddresses } from "../../lib/utils"
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../../lib/constants/common`)
import hre from "hardhat"
import { BigNumber } from "ethers";

const AssetDistribution = [
  { address: "0xdf261f967e87b2aa44e18a22f4ace5d7f74f03cc", amount: "79918757012930524150", desc: "Contract LiquidUnstakePoolProxy" },
  // { address: "0xa3a7b6f88361f48403514059f1f16c8e78d60eec", amount: "522716544385447866", desc: "Contract L1ERC20Gateway"},
  // { address: "0x39d4442d8d2d3bc1861c6f9e612654fecdc1bf1d", amount: "61581131366932074", desc: "Contract LSDVault"},
  // { address: "0x69e3a362ffd379cb56755b142c2290afbe5a6cc8", amount: "1915323993452689589", desc: "Contract DemocraciaDAO"},
  // { address: "0xcf0e3ab3bc3b4a64f2d169decea24bc17b038278", amount: "20928377800788670", desc: "Contract UniswapV3Pool"},
  { address: "0xc0a9a14ace68a3eb4f8672e8aaab8ac4fe8037f1", amount: "606882430814223716", desc: "Contract GnosisSafeProxy" },
  // { address: "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1", amount: "10582840072085351681", desc: "Contract L1ChugSplashProxy"},
  // { address: "0x051f1d88f0af5763fb888ec4378b4d8b29ea3319", amount: "9647705671582055542", desc: "Contract TokenBridge"},
  { address: "0x8e3b0600c06bb4b99f5eab33d3a25e338818fbe2", amount: "10671158935437675", desc: "Contract GnosisSafeProxy" },
  // { address: "0xe37e799d5077682fa0a244d46e5649f71457bd09", amount: "1", desc: "Contract Self Destructed"},
  { address: "0x52e5219ef6af019776c0a64925370f92cab282ec", amount: "3066435667469606826", desc: "EOA" },
  { address: "0x962d00611208f83175da312277925b88e44708c7", amount: "184100033021821540564", desc: "EOA" },
  //{ address: "0x8c89569355f321a91655ca520fc09be5f6b0ec4d", amount: "596919356500619824", desc: "EOA"},
  { address: "0x0b438de1dca9fba6d14f17c1f0969ecc73c8186f", amount: "100000000000000000", desc: "EOA" },
  { address: "0x87e6bd1b34ebdfdf40d832950bac8e4eedee01a9", amount: "99322018062039639", desc: "EOA" },
  { address: "0xf5f67a092ce0f580b43ed3d7dbaa7ab91f772a00", amount: "29112158304526815", desc: "EOA" },
  { address: "0x81a09e5056d3917fc0f3c65ee8c5ebfb10ddcb06", amount: "219099464927160170", desc: "EOA" },
  { address: "0x18f08ba90c58fc84767568b5d26b41fce2af539b", amount: "90881626233571038", desc: "EOA" },
  { address: "0x058f63fe9115a8abafa59a16861cf0d01f34d44d", amount: "5421257070010365004", desc: "EOA" },
  { address: "0xe8c5188b590b8ce9750d7f649b66577213f35121", amount: "98382101324321416", desc: "EOA" },
  { address: "0xe061a501757fa46ab2b1f2068204cc1c1107b0d8", amount: "3933384838262828002", desc: "EOA" },
  { address: "0xc25d79fc4970479b88068ce8891ed9be5799210d", amount: "9648880360516059", desc: "EOA" },
  { address: "0x4a95c5b6a668185fc75beb2c14e65417d1752507", amount: "9223026861077183", desc: "EOA" },
  { address: "0x9b74143767eb39bc928ddcd90997ff4a9bbc0e6b", amount: "2526889304673", desc: "EOA" },
  { address: "0x6236b9a8477d934dd1bfc9899bd8a11b8a670afc", amount: "9767546877671164", desc: "EOA" },
  { address: "0xd88e7d30f7548b7a7c6bfe513629724916449e6d", amount: "8763745078458273", desc: "EOA" },
  { address: "0x49a323cc2fa5f9a138f30794b9348e43065d8da2", amount: "16580521269363721355", desc: "EOA" },
  { address: "0x15f4de244107dfd83039927becb74934969087c2", amount: "90877253172827758", desc: "EOA" },
  { address: "0x7133c664af6763ab9aeeb095d3c114a750d8dfdc", amount: "10674802129470624", desc: "EOA" },
  { address: "0xada20b8e80e855f851dc865a31525c0c8353e793", amount: "9695238286207744", desc: "EOA" },
  { address: "0x3102c67d240194b78b1d3dc5c2325820f3e8a298", amount: "9562558537311800", desc: "EOA" },
  { address: "0x59f001c182a152e299ef188fabd8f95ae4a49dbc", amount: "20000000000000000", desc: "EOA" },
  { address: "0x267a9a250618ea3b5446f3fd1d9cfefe94367d4f", amount: "20000000000000000", desc: "EOA" },
  { address: "0x75dddfb045c0f0ef72d940fe935bf36e773eb05b", amount: "77341666424115901", desc: "EOA" },
  { address: "0x97bb51c6237cb5c2d87d68bcb1a2886a5154b194", amount: "9676459157420633", desc: "EOA" },
  { address: "0x17105910c37eeba88cfb4db060427c488f81d517", amount: "9676454671045203", desc: "EOA" },
  { address: "0x43f0a8c5bf46f14741d07d293798da0274343a70", amount: "9676448145415641", desc: "EOA" },
  { address: "0xa38345bae44c4d94055b32c2239bf3634ca1ef75", amount: "9676444474752880", desc: "EOA" },
  { address: "0x1cb926a4a981317c5895096dc1ebbfae33eec6c2", amount: "9676437541286374", desc: "EOA" },
  { address: "0x6a532ea3a89bd1b3abcef030fb1c72ffc0f953f9", amount: "9676415925248692", desc: "EOA" },
  { address: "0x038c24a248daf9d6880582ae9e836064a0ccb6e3", amount: "4892197201861967", desc: "EOA" },
  { address: "0xf5597b4094058efe44fe61c8f2844823fc566e3c", amount: "4989941859897", desc: "EOA" },
  { address: "0x14acc6205e6563e6ff727dc10b34279d7f02b9c2", amount: "11587947647674827", desc: "EOA" },
  { address: "0x9a1b5a13160b04a87b7ea211d7bcd15c973d728c", amount: "11587947335558845", desc: "EOA" },
  { address: "0xe8123eead8c1fe0dd3943aa29090e29343fa2ee1", amount: "11587947335558845", desc: "EOA" },
  { address: "0x21fa7f8238a84565dafc7681eda644009ca15ae7", amount: "11587945774979188", desc: "EOA" },
  { address: "0x23afcbf09adaa4ceefdcba302f63940997d3b54f", amount: "10622283054851823", desc: "EOA" },
  { address: "0x3ef4d6d373714ea64b47c1c8f50a1e92d95c5d6c", amount: "9656617317605926", desc: "EOA" },
  { address: "0x7dbc94294633f2200c9cf9043af1975002a115e4", amount: "9656614196450732", desc: "EOA" },
  { address: "0x4c615626cbb1e2eb1e32ac521943c56e8717777e", amount: "10622273613355580", desc: "EOA" },
  { address: "0xa7c5d40c7436aee462414be6e014ef228c25ba9b", amount: "10622273041144226", desc: "EOA" },
  { address: "0xf1552d1d7cd279a7b766f431c5fac49a2fb6e361", amount: "129862652049885841966", desc: "EOA" },
  { address: "0xbf4d5573f08d617f9924cb0c7339ca44d357ff42", amount: "1000000000000000000", desc: "EOA" },
  { address: "0x3dada60b92650a9d79a97c2ac62d8a908c242779", amount: "1022037699364", desc: "EOA" },
  { address: "0x366659f6acc1b3842957594bf5f51289272ef964", amount: "28433311340968036", desc: "EOA" },
  { address: "0xa3d4b3d9b38cba938055fe989686ee9116a3bdef", amount: "35661233220779221", desc: "EOA" },
  { address: "0x0ce522cad66fa4d6529b2db76e0a91d53296d58b", amount: "9635105086856286", desc: "EOA" },
  { address: "0x4263df45b2958650542edc7abdf89ef7994d317a", amount: "10598577867308190", desc: "EOA" },
  { address: "0x3993de5c48c67e82b0cd6b7bcb39080afd3f3833", amount: "10598572370501854", desc: "EOA" },
  { address: "0xfa9ed532d36dd0a4cc83a7c9192638b673c463f8", amount: "10598547634943898", desc: "EOA" },
  { address: "0x81b07eb18f2324f275f7cb457060f80b4121f9c6", amount: "10598517754503594", desc: "EOA" },
  { address: "0x4692cc00f9a7ebdd0c3f6557b62f552bd681bcd8", amount: "9624123490232350", desc: "EOA" },
  { address: "0xdb1475c914abe2ef133a8523410946b74a09a770", amount: "9624117798881777", desc: "EOA" },
  { address: "0xffd24214e68771b059b3f3e6ca1c401eec8bba07", amount: "9624113530373265", desc: "EOA" },
  { address: "0xb5dc07e23308ec663e743b1196f5a5569e4e0555", amount: "23932689055248430", desc: "EOA" },
  { address: "0x729b9b0e37fff72975812a74edb38855f5123165", amount: "35702537321885605", desc: "EOA" },
  { address: "0x24d3590163046ef79d485c68d636f576bd99875c", amount: "28809728610976519", desc: "EOA" },
  { address: "0x64baeb02876aa58078aa25c1c43b7a5492873559", amount: "202880256089500949", desc: "EOA" },
  { address: "0xa8b4c7f8b3d91b324f815252da74884e68fb4c4c", amount: "61891094434206170", desc: "EOA" },
  { address: "0x2134c525b8731fc859a6bb98ad05f42a1e754704", amount: "2755520297390913738", desc: "EOA" },
  { address: "0xaac60f24340f7f3ba791a617dc6504b63bab2e09", amount: "4768891511200023", desc: "EOA" },
  { address: "0x22b1d4994057a9c4173e9a038e59b9c4e1223f4d", amount: "30697115257382134", desc: "EOA" },
  { address: "0xc6c46689f8aab76c563d04c19571cc0d483d099f", amount: "206252396144559819", desc: "EOA" },
  { address: "0x56cfcaa14c2d63fef909e335733de4c6330306a7", amount: "52118490013140641", desc: "EOA" },
  { address: "0x49e53fb3d5bf1532febad88a1979e33a94844d1d", amount: "14426605828313899", desc: "EOA" },
  { address: "0x2929f6fedd4897236fb97a059aaa1fe057adeb0e", amount: "229811147789133268", desc: "EOA" },
  { address: "0x2fcc020f72e5d2edd2a24d04f3dc90d7fdfbd1dd", amount: "55165008894421830", desc: "EOA" },
  { address: "0xf765f24486ebb671c86a61eba9a0a99d13a605ff", amount: "2924594255071", desc: "EOA" },
  { address: "0x1008d3fbd618d32583e05371dbfc939ac4073956", amount: "1001301823359244", desc: "EOA" },
  { address: "0xf7b188d84192e23049da2e659ddc2d79d7c85e1d", amount: "2534906021240682", desc: "EOA" },
  { address: "0xcc45554aff9390ed0e4f61ef07d0de15ddb44ecf", amount: "9534775474142764", desc: "EOA" },
  { address: "0x9673bf5fce0fa5316d7b77cabfdeca2bbc554ddb", amount: "9534746561733030", desc: "EOA" },
  { address: "0xa23ad558b0c07c040ca69a1dc3fa4212e5f82605", amount: "9533537216334277", desc: "EOA" },
  { address: "0x8e3e8bf78a2fba58a4096707050c307625c64101", amount: "599040391545197995", desc: "EOA" },
  { address: "0xdc025b5e0afbe6eb1af28c8a5b66e5feee5f20e5", amount: "854753755440344849", desc: "EOA" },
  { address: "0xf719ae6b7ca7be6b95e09a0bee44e9ae6fbc5b35", amount: "94073606835928672", desc: "EOA" },
  { address: "0xf7c05db7485e5c707335bd55517a8661d3ef5d46", amount: "1589509544715778", desc: "EOA" },
  { address: "0x54147b20bba28f0f32f9905dc7d1fb980c862700", amount: "337836059209519452672", desc: "EOA" },
  { address: "0xd0ce021bceff33ca74c7b26a108fbbef75bc060d", amount: "68000000000000", desc: "EOA" },
  { address: "0x44d44a37868d027dabac36e6f92e9f570e9fd6b2", amount: "699943398508742122", desc: "EOA" },
  { address: "0x382ffce2287252f930e1c8dc9328dac5bf282ba1", amount: "7943652345444556", desc: "EOA" },
  { address: "0x58ea8ae521ea8be593723f1c1502dfb4127f8405", amount: "209669199199839638", desc: "EOA" },
  { address: "0x5504e7aea0cf0582f7db6fd9c810f3810425a6c2", amount: "9330362223376450", desc: "EOA" },
  { address: "0x46e1c5574c68418d0bc3378b17b5492f66ac3331", amount: "65305392880384054", desc: "EOA" },
  { address: "0x546457bbddf5e09929399768ab5a9d588cb0334d", amount: "465121362094816902", desc: "EOA" },
  { address: "0x137c265e744687bdbc897ff288d2f94c42b62387", amount: "9299021388055561", desc: "EOA" },
  { address: "0x3b15953d59791b86c709a03819030a4faf601cb5", amount: "92992580574924095", desc: "EOA" },
  { address: "0x5c3e2c131cb10e4f4c9df581725bee57443d8523", amount: "629793953854527678", desc: "EOA" },
  { address: "0x88e9c9576608dd84dd96c4a9ad2e7428546678b5", amount: "4770000000000000", desc: "EOA" },
  { address: "0xad01c20d5886137e056775af56915de824c8fce5", amount: "7067848650227", desc: "EOA" },
  { address: "0xd45965998c480dd227ee0424e33b0b6af6dd8f46", amount: "43438159157442257", desc: "EOA" },
  { address: "0x092cff73c77a9de794d25b0088ded0e430733dbb", amount: "37130354195410927", desc: "EOA" },
  { address: "0x8d713a2906cb5eec7d1f7324d79200052f1d08d6", amount: "9280038249631209", desc: "EOA" },
  { address: "0xd49c95939293b4a0b66645b3e90e6006bc905353", amount: "18683715639056427", desc: "EOA" },
  // { address: "0xd9ca4a0ea7df6ca19b65cf6729f979c5674737a1", amount: "51", desc: "EOA"},
  { address: "0xafd65f75ac34bc9c45cd343e2bee7b565b72df07", amount: "1744941327871862", desc: "EOA" },
  { address: "0x1181c8b632cc2b30f0d66a5bab15c4d9ed5e5ed2", amount: "9228797453488929", desc: "EOA" },
  { address: "0x56b4a25bad9a9467ddd0a329a3b261b2f8639985", amount: "9206741406983850", desc: "EOA" },
  { address: "0x25517dd8265d936fee883591b57ab5cd76741ea4", amount: "18447958276970484640", desc: "EOA" },
  { address: "0x88f5354b08b674e93439a2be83dc1ffa8d849564", amount: "36795860968595162", desc: "EOA" },
  { address: "0x58287d4dc467b79ad3cd7ef65338150943a18eb5", amount: "67490374589557770", desc: "EOA" },
  { address: "0x81857dacf824c3b5e7d3b284a5c6243746445e74", amount: "14634913051368965", desc: "EOA" },
  { address: "0xde551e7dc235d8ffb962ff9ea1bed8c9831a997b", amount: "1162624932445680597", desc: "EOA" },
  { address: "0xc4851acd8f5162c510737247ecaaef73e895fd74", amount: "27378373170751928", desc: "EOA" },
  { address: "0x0ac5d342e606c048a03c5fa7efe514f79ee76d2a", amount: "9127721713257574", desc: "EOA" },
  { address: "0x4be9601477b1417c591f63447282ec6e385ab537", amount: "18189204716486618", desc: "EOA" },
]

async function main() {
  // TODO LOG network from hardhat console.log(`Network:${NETWORK}`)
  const NETWORK = hre.network.name;
  console.log(NETWORK);
  const [trustedDistributor] = await ethers.getSigners()

  const MultiTransferAddress = NETWORK_DEPLOYED_ADDRESSES['MultiTransfer'];
  const StakingV2ProxyAddress = NETWORK_DEPLOYED_ADDRESSES['StakingV2Proxy'];

  console.log("MultiTransferAddress: ", MultiTransferAddress);
  console.log("stETH address: ", StakingV2ProxyAddress);

  const MultiTransfer = await hre.ethers.getContractAt("MultiTransfer", MultiTransferAddress);
  const StakingV2Proxy = await hre.ethers.getContractAt("Staking", StakingV2ProxyAddress);

  let res1 = await StakingV2Proxy.connect(trustedDistributor).approve(MultiTransfer.address, ethers.constants.MaxUint256);
  res1.wait();

  console.log("allowance: ", await StakingV2Proxy.allowance(trustedDistributor.address, MultiTransfer.address));

  let toDistribute = [];
  for (let i = 0; i < AssetDistribution.length; i++) {
    // for (let i = 0; i < 10; i++) {
    toDistribute.push({
      receiver_id: AssetDistribution[i].address,
      amount: AssetDistribution[i].amount,
    })
  }

  // console.log("toDistribute: ", toDistribute);

  let res2 = await MultiTransfer.connect(trustedDistributor).multiTransfer(StakingV2ProxyAddress, toDistribute);
  res2.wait();
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

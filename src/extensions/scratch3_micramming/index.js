/**
* This is the extension designed for Scratch3.0 by Seiji Matsushita in Japan
*  to have fan of programming to manipulate a Minecraft world.
*
* This requires "raspberryjammod" at least,
*  which is to be installed with Minecraft based on "Forge".
* Please see also "https://github.com/arpruss/raspberryjammod".
*
* This has the two mode to communicate with "raspberryjammod", which manipulates Minecraft.
*
* One mode sends commands directly to "raspberryjammod" by WebSocket,
*  but it enables only some basic blocks to work. 
*
* The other mode sends abstract commands to "scratchserver.py" as the helper http server,
*  so that Scratch can work easily and very fast.
*
* If the helper "scratchserver.py" is installed and running,
*  all of blocks in this extension can work for Minecraft.
* Otherwise, some blocks which can draw complex 2D/3D figures, for example "draw egg", "draw ellipse", etc,
*  cannot work and will issue error status.
*
* The helper is written in Python3 with "aiohttp" package and should be in "mcpipy" directory.
*  ("mcpipy" can be got with "raspberryjammod".)
* It receives each abstract command as http GET, formatted as below.
*  "http://hostname:12345/command[/param1][/param2]...[/paramN]
* And it analyzes to send series of basic commands to "raspberryjammod".
* So Scratch can work fast and have more complex command blocks.
*
*  
* --- mode selector in the source ---
*
* MicraWorld._Mode_WithHelper: 
*
*   The Mode whether this extension needs the helper "scratchserver.py" or not.
*     true :  need "scratchserver.py" and all blocks can work.
*     false:  don't need "scratchserver.py" but it's only some basical blocks that can work.
*
*/

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const nets = require('nets');


const EXTENSION_NAME = {
	'ja'     : 'マイクラミング',
	'ja-Hira': 'マイクラミング',
	'en'     : 'Micramming'
};

const blockIconURI = 'data:image/png;base64,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';

const BLOCKS ={
	'ja': [
		[0,   0,  '空気'],
		[1,   0,  '石'],
		[2,   0,  '草'],
		[3,   0,  '土'],
		[4,   0,  '丸石'],
		[5,   0,  'オークの木材'],
		[5,   1,  '松の木材'],
		[5,   2,  'シラカバの木材'],
		[5,   3,  'ジャングルの木材'],
		[5,   4,  'アカシアの木材'],
		[5,   5,  'ダークオークの木材'],
		[6,   0,  '苗木'],
		[7,   0,  '岩ばん'],
		[8,   0,  '流れる水'],
		[9,   0,  '止まった水'],
		[10,  0,  '流れる溶岩'],
		[11,  0,  '止まった溶岩'],
		[12,  0,  '砂'],
		[13,  0,  '砂利'],
		[17,  0,  '原木'],
		[20,  0,  'ガラス'],
		[22,  0,  'ラピスラズリブロック'],
		[24,  0,  '砂岩'],
		[41,  0,  '金ブロック'],
		[42,  0,  '鉄ブロック'],
		[44,  0,  '石ハーフ'],
		[45,  0,  'レンガ'],
		[49,  0,  '黒よう石'],
		[57,  0,  'ダイヤモンドブロック'],
		[79,  0,  '氷'],
		[80,  0,  '雪ブロック'],
		[88,  0,  'ソウルサンド'],
		[133, 0,  'エメラルドブロック'],
		[152, 0,  'レッドストーンブロック'],
		[153, 0,  'ネザー水晶ブロック'],
		[165, 0,  'スライムブロック'],
		//REDs
		[23,  0,  'ディスペンサー'],
		[25,  0,  '音符ブロック'],
		[27,  0,  'パワードレース'],
		[28,  0,  'ディテクターレール'],
		[33,  0,  'ピストン'],
		[46,  0,  'TNT'],
		[52,  0,  'モンスタースポナー'],
		[54,  0,  'チェスト'],
		[66,  0,  'レール'],
		[69,  0,  'レバー'],
		[72,  0,  '木の感圧版'],
		[77,  0,  '石のボタン'],
		[137, 0,  'コマンドブロック'],
		[138, 0,  'ビーコン'],
		[143, 0,  '木のボタン'],
		[151, 0,  '日照センサー'],
		//DECOs
		[26,  0,  'ベッド'],
		[30,  0,  'クモの巣'],
		[39,  0,  '茶キノコ'],
		[40,  0,  '赤キノコ'],
		[47,  0,  '本だな'],
		[50,  0,  'たいまつ'],
		[51,  0,  '炎'],
		[53,  0,  'オークの木の階段'],
		[64,  0,  '木のドア'],
		[65,  0,  'はしご'],
		[71,  0,  '鉄のドア'],
		[78,  0,  '雪'],
		[81,  0,  'サボテン'],
		[89,  0,  'グロウストーン'],
		[91,  0,  'ジャック・オ・ランタン'],
		[113, 0,  'ネザーレンガのフェンス'],
		[175, 0,  'ひまわり'],
		//WOOLs
		[35,  0,  '羊毛'],
		[35,  0,  '白色の羊毛'],
		[35,  1,  'だいだい色の羊毛'],
		[35,  2,  '赤むらさき色の羊毛'],
		[35,  3,  '水色の羊毛'],
		[35,  4,  '黄色の羊毛'],
		[35,  5,  '黄緑色の羊毛'],
		[35,  6,  'もも色の羊毛'],
		[35,  7,  '灰色の羊毛'],
		[35,  8,  'うすい灰色の羊毛'],
		[35,  9,  '空色の羊毛'],
		[35,  10,  'むらさき色の羊毛'],
		[35,  11,  '青色の羊毛'],
		[35,  12,  '茶色の羊毛'],
		[35,  13,  '緑色の羊毛'],
		[35,  14,  '赤色の羊毛'],
		[35,  15,  '黒色の羊毛'],
		//SGLASSs
		[95,  0,  'ステンドグラス'],
		[95,  0,  '白色のステンドグラス'],
		[95,  1,  'だいだい色のステンドグラス'],
		[95,  2,  '赤むらさき色のステンドグラス'],
		[95,  3,  '水色のステンドグラス'],
		[95,  4,  '黄色のステンドグラス'],
		[95,  5,  '黄緑色のステンドグラス'],
		[95,  6,  'もも色のステンドグラス'],
		[95,  7,  '灰色のステンドグラス'],
		[95,  8,  'うすい灰色のステンドグラス'],
		[95,  9,  '空色のステンドグラス'],
		[95,  10,  'むらさき色のステンドグラス'],
		[95,  11,  '青色のステンドグラス'],
		[95,  12,  '茶色のステンドグラス'],
		[95,  13,  '緑色のステンドグラス'],
		[95,  14,  '赤色のステンドグラス'],
		[95,  15,  '黒色のステンドグラス'],
		//CARPETs
		[171,  0,  'カーペット'],
		[171,  0,  '白色のカーペット'],
		[171,  1,  'だいだい色のカーペット'],
		[171,  2,  '赤むらさき色のカーペット'],
		[171,  3,  '水色のカーペット'],
		[171,  4,  '黄色のカーペット'],
		[171,  5,  '黄緑色のカーペット'],
		[171,  6,  'もも色のカーペット'],
		[171,  7,  '灰色のカーペット'],
		[171,  8,  'うすい灰色のカーペット'],
		[171,  9,  '空色のカーペット'],
		[171,  10,  'むらさき色のカーペット'],
		[171,  11,  '青色のカーペット'],
		[171,  12,  '茶色のカーペット'],
		[171,  13,  '緑色のカーペット'],
		[171,  14,  '赤色のカーペット'],
		[171,  15,  '黒色のカーペット']
	],

	'ja-Hira': [
		[0,   0,  'くうき'],
		[1,   0,  'いし'],
		[2,   0,  'くさ'],
		[3,   0,  'つち'],
		[4,   0,  'まるいし'],
		[5,   0,  'オークのもくざい'],
		[5,   1,  'まつのもくざい'],
		[5,   2,  'シラカバのもくざい'],
		[5,   3,  'ジャングルのもくざい'],
		[5,   4,  'アカシアのもくざい'],
		[5,   5,  'ダークオークのもくざい'],
		[6,   0,  'なえぎ'],
		[7,   0,  'がんばん'],
		[8,   0,  'ながれるみず'],
		[9,   0,  'とまったみず'],
		[10,  0,  'ながれるようがん'],
		[11,  0,  'とまったようがん'],
		[12,  0,  'すな'],
		[13,  0,  'じゃり'],
		[17,  0,  'げんぼく'],
		[20,  0,  'ガラス'],
		[22,  0,  'ラピスラズリブロック'],
		[24,  0,  'さがん'],
		[41,  0,  'きんブロック'],
		[42,  0,  'てつブロック'],
		[44,  0,  'いしハーフ'],
		[45,  0,  'レンガ'],
		[49,  0,  'こくようせき'],
		[57,  0,  'ダイヤモンドブロック'],
		[79,  0,  'こおり'],
		[80,  0,  'ゆきブロック'],
		[88,  0,  'ソウルサンド'],
		[133, 0,  'エメラルドブロック'],
		[152, 0,  'レッドストーンブロック'],
		[153, 0,  'ネザーすいしょうブロック'],
		[165, 0,  'スライムブロック'],
		//REDs
		[23,  0,  'ディスペンサー'],
		[25,  0,  'おんぷブロック'],
		[27,  0,  'パワードレース'],
		[28,  0,  'ディテクターレール'],
		[33,  0,  'ピストン'],
		[46,  0,  'TNT'],
		[52,  0,  'モンスタースポナー'],
		[54,  0,  'チェスト'],
		[66,  0,  'レール'],
		[69,  0,  'レバー'],
		[72,  0,  'きのかんあつばん'],
		[77,  0,  'いしのボタン'],
		[137, 0,  'コマンドブロック'],
		[138, 0,  'ビーコン'],
		[143, 0,  'きのボタン'],
		[151, 0,  'にっしょうセンサー'],
		//DECOs
		[26,  0,  'ベッド'],
		[30,  0,  'クモのす'],
		[39,  0,  'ちゃキノコ'],
		[40,  0,  'あかキノコ'],
		[47,  0,  'ほんだな'],
		[50,  0,  'たいまつ'],
		[51,  0,  'ほのお'],
		[53,  0,  'オークのきのかいだん'],
		[64,  0,  'きのドア'],
		[65,  0,  'はしご'],
		[71,  0,  'てつのドア'],
		[78,  0,  'ゆき'],
		[81,  0,  'サボテン'],
		[89,  0,  'グロウストーン'],
		[91,  0,  'ジャック・オ・ランタン'],
		[113, 0,  'ネザーレンガのフェンス'],
		[175, 0,  'ひまわり'],
		//WOOLs
		[35,  0,  'ようもう'],
		[35,  0,  'しろいろのようもう'],
		[35,  1,  'だいだいいろのようもう'],
		[35,  2,  'あかむらさきいろのようもう'],
		[35,  3,  'みずいろのようもう'],
		[35,  4,  'きいろのようもう'],
		[35,  5,  'きみどりいろのようもう'],
		[35,  6,  'ももいろのようもう'],
		[35,  7,  'はいいろのようもう'],
		[35,  8,  'うすいはいいろのようもう'],
		[35,  9,  'そらいろのようもう'],
		[35,  10,  'むらさきいろのようもう'],
		[35,  11,  'あおいろのようもう'],
		[35,  12,  'ちゃいろのようもう'],
		[35,  13,  'みどりいろのようもう'],
		[35,  14,  'あかいろのようもう'],
		[35,  15,  'くろいろのようもう'],
		//SGLASSs
		[95,  0,  'ステンドグラス'],
		[95,  0,  'しろいろのステンドグラス'],
		[95,  1,  'だいだいいろのステンドグラス'],
		[95,  2,  'あかむらさきいろのステンドグラス'],
		[95,  3,  'みずいろのステンドグラス'],
		[95,  4,  'きいろのステンドグラス'],
		[95,  5,  'きみどりいろのステンドグラス'],
		[95,  6,  'ももいろのステンドグラス'],
		[95,  7,  'はいいろのステンドグラス'],
		[95,  8,  'うすいはいいろのステンドグラス'],
		[95,  9,  'そらいろのステンドグラス'],
		[95,  10,  'むらさきいろのステンドグラス'],
		[95,  11,  'あおいろのステンドグラス'],
		[95,  12,  'ちゃいろのステンドグラス'],
		[95,  13,  'みどりいろのステンドグラス'],
		[95,  14,  'あかいろのステンドグラス'],
		[95,  15,  'くろいろのステンドグラス'],
		//CARPETs
		[171,  0,  'カーペット'],
		[171,  0,  'しろいろのカーペット'],
		[171,  1,  'だいだいいろのカーペット'],
		[171,  2,  'あかむらさきいろのカーペット'],
		[171,  3,  'みずいろのカーペット'],
		[171,  4,  'きいろのカーペット'],
		[171,  5,  'きみどりのカーペット'],
		[171,  6,  'ももいろのカーペット'],
		[171,  7,  'はいいろのカーペット'],
		[171,  8,  'うすいはいいろのカーペット'],
		[171,  9,  'そらいろのカーペット'],
		[171,  10,  'むらさきいろのカーペット'],
		[171,  11,  'あおいろのカーペット'],
		[171,  12,  'ちゃいろのカーペット'],
		[171,  13,  'みどりいろのカーペット'],
		[171,  14,  'あかいろのカーペット'],
		[171,  15,  'くろいろのカーペット']
	],

	'en': [
		[0,   0,  'Air'],
		[1,   0,  'Stone'],
		[2,   0,  'Grass'],
		[3,   0,  'Dirt'],
		[4,   0,  'Cobblestone'],
		[5,   0,  'Oak Wood Plank'],
		[5,   1,  'Spruce Wood Plank'],
		[5,   2,  'Birch Wood Plank'],
		[5,   3,  'Jungle Wood Plank'],
		[5,   4,  'Acacia Wood Plank'],
		[5,   5,  'Dark Oak Wood Plank'],
		[6,   0,  'Oak Sapling'],
		[7,   0,  'Bedrock'],
		[8,   0,  'Flowing Water'],
		[9,   0,  'Still Water'],
		[10,  0,  'Flowing Lava'],
		[11,  0,  'Still Lava'],
		[12,  0,  'Sand'],
		[13,  0,  'Gravel'],
		[17,  0,  'Oak Wood'],
		[20,  0,  'Glass'],
		[22,  0,  'Lapis Lazuli Block'],
		[24,  0,  'Sandstone'],
		[41,  0,  'Gold Block'],
		[42,  0,  'Iron Block'],
		[44,  0,  'Stone Slab'],
		[45,  0,  'Bricks'],
		[49,  0,  'Obsidian'],
		[57,  0,  'Diamond Block'],
		[79,  0,  'Ice'],
		[80,  0,  'Snow Block'],
		[88,  0,  'Soul Sand'],
		[133, 0,  'Emerald Block'],
		[152, 0,  'Redstone Block'],
		[153, 0,  'Nether Quartz Ore'],
		[165, 0,  'Slime Block'],
		//REDs
		[23,  0,  'Dispenser'],
		[25,  0,  'Note Block'],
		[27,  0,  'Powered Rail'],
		[28,  0,  'Detector Rail'],
		[33,  0,  'Piston'],
		[46,  0,  'TNT'],
		[52,  0,  'Monster Spawner'],
		[54,  0,  'Chest'],
		[66,  0,  'Rail'],
		[69,  0,  'Lever'],
		[72,  0,  'Wooden Pressure Plate'],
		[77,  0,  'Stone Button'],
		[137, 0,  'Command Block'],
		[138, 0,  'Beacon'],
		[143, 0,  'Wooden Button'],
		[151, 0,  'Daylight Sensor'],
		//DECOs
		[26,  0,  'Bed'],
		[30,  0,  'Cobweb'],
		[39,  0,  'Brown Mushroom'],
		[40,  0,  'Red Mushroom'],
		[47,  0,  'Bookshelf'],
		[50,  0,  'Torch'],
		[51,  0,  'Fire'],
		[53,  0,  'Oak Wood Stairs'],
		[64,  0,  'Oak Door Block'],
		[71,  0,  'Iron Door Block'],
		[78,  0,  'Snow'],
		[81,  0,  'Cactus'],
		[89,  0,  'Glowstone'],
		[91,  0,  'Jack o\'Lantern'],
		[113, 0,  'Nether Brick Fence'],
		[175, 0,  'Sunflower'],
		//WOOLs
		[35,  0,  'Wool'],
		[35,  0,  'White Wool'],
		[35,  1,  'Orange Wool'],
		[35,  2,  'Magenta Wool'],
		[35,  3,  'Light Blue Wool'],
		[35,  4,  'Yellow Wool'],
		[35,  5,  'Lime Wool'],
		[35,  6,  'Pink Wool'],
		[35,  7,  'Gray Wool'],
		[35,  8,  'Light Gray Wool'],
		[35,  9,  'Cyan Wool'],
		[35,  10,  'Purple Wool'],
		[35,  11,  'Blue Wool'],
		[35,  12,  'Brown Wool'],
		[35,  13,  'Green Wool'],
		[35,  14,  'Red Wool'],
		[35,  15,  'Black Wool'],
		//SGLASSs
		[95,  0,  'Stained Glass'],
		[95,  0,  'White Stained Glass'],
		[95,  1,  'Orange Stained Glass'],
		[95,  2,  'Magenta Stained Glass'],
		[95,  3,  'Light Blue Stained Glass'],
		[95,  4,  'Yellow Stained Glass'],
		[95,  5,  'Lime Stained Glass'],
		[95,  6,  'Pink Stained Glass'],
		[95,  7,  'Gray Stained Glass'],
		[95,  8,  'Light Gray Stained Glass'],
		[95,  9,  'Cyan Stained Glass'],
		[95,  10,  'Purple Stained Glass'],
		[95,  11,  'Blue Stained Glass'],
		[95,  12,  'Brown Stained Glass'],
		[95,  13,  'Green Stained Glass'],
		[95,  14,  'Red Stained Glass'],
		[95,  15,  'Black Stained Glass'],
		//CARPETs
		[171,  0,  'Carpet'],
		[171,  0,  'White Carpet'],
		[171,  1,  'Orange Carpet'],
		[171,  2,  'Magenta Carpet'],
		[171,  3,  'Light Blue Carpet'],
		[171,  4,  'Yellow Carpet'],
		[171,  5,  'Lime Carpet'],
		[171,  6,  'Pink Carpet'],
		[171,  7,  'Gray Carpet'],
		[171,  8,  'Light Gray Carpet'],
		[171,  9,  'Cyan Carpet'],
		[171,  10,  'Purple Carpet'],
		[171,  11,  'Blue Carpet'],
		[171,  12,  'Brown Carpet'],
		[171,  13,  'Green Carpet'],
		[171,  14,  'Red Carpet'],
		[171,  15,  'Black Carpet']
	]
};

const MENU_BLOCKS = {
	'ja'     : ['空気','石','草','土','丸石','オークの木材','松の木材','シラカバの木材','ジャングルの木材','アカシアの木材','ダークオークの木材','苗木','岩ばん','流れる水','止まった水','流れる溶岩','止まった溶岩','砂','じゃり','原木','ガラス','ラピスラズリブロック','砂岩','金ブロック','鉄ブロック','石ハーフ','レンガ','黒よう石','ダイヤモンドブロック','氷','雪ブロック','ソウルサンド','エメラルドブロック','レッドストーンブロック','ネザー水晶ブロック','スライムブロック'],
	'ja-Hira': ['くうき','いし','くさ','つち','まるいし','オークのもくざい','まつのもくざい','シラカバのもくざい','ジャングルのもくざい','アカシアのもくざい','ダークオークのもくざい','なえぎ','がんばん','ながれるみず','とまったみ','ながれるようがん','とまったようがん','すな','じゃり','げんぼく','ガラス','ラピスラズリブロック','さがん','きんブロック','てつブロック','いしハーフ','レンガ','こくようせき','ダイヤモンドブロック','こおり','ゆきブロック','ソウルサンド','エメラルドブロック','レッドストーンブロック','ネザーすいしょうブロック','スライムブロック'],
	'en'     : ['Air','Stone','Grass','Dirt','Cobblestone','Oak Wood Plank','Spruce Wood Plank','Birch Wood Plank','Jungle Wood Plank','Acacia Wood Plank','Dark Oak Wood Plank','Oak Sapling','Bedrock','Flowing Water','Still Water','Flowing Lava','Still Lava','Sand','Gravel','Oak Wood','Glass','Lapis Lazuli Block','Sandstone','Gold Block','Iron Block','Stone Slab','Bricks','Obsidian','Diamond Block','Ice','Snow Block','Soul Sand','Emerald Block','Redstone Block','Nether Quartz Ore','Slime Block']
};

const MENU_REDS = {
	'ja'     : ['ディスペンサー','音符ブロック','パワードレース','ディテクターレール','ピストン','TNT','モンスタースポナー','チェスト','レール','レバー','木の感圧版','石のボタン','コマンドブロック','ビーコン','木のボタン','日照センサー'],
	'ja-Hira': ['ディスペンサー','おんぷブロック','パワードレース','ディテクターレール','ピストン','TNT','モンスタースポナー','チェスト','レール','レバー','きのかんあつばん','いしのボタン','コマンドブロック','ビーコン','きのボタン','にっしょうセンサー'],
	'en'     : ['Dispenser','Note Block','Powered Rail','Detector Rail','Piston','TNT','Monster Spawner','Chest','Rail','Lever','Wooden Pressure Plate','Stone Button','Command Block','Beacon','Wooden Button','Daylight Sensor']
};

const MENU_DECOS = {
	'ja'     : ['ベッド','クモの巣','茶キノコ','赤キノコ','本だな','たいまつ','炎','オークの木の階段','木のドア','はしご','鉄のドア','雪','サボテン','グロウストーン','ジャック・オ・ランタン','ネザーレンガのフェンス','ひまわり'],
	'ja-Hira': ['ベッド','クモのす','ちゃキノコ','あかキノコ','ほんだな','たいまつ','ほのお','オークのきのかいだん','きのドア','はしご','てつのドア','ゆき','サボテン','グロウストーン','ジャック・オ・ランタン','ネザーレンガのフェンス','ひまわり'],
	'en'     : ['Bed','Cobweb','Brown Mushroom','Red Mushroom','Bookshelf','Torch','Fire','Oak Wood Stairs','Oak Door Block','Ladder','Iron Door Block','Snow','Cactus','Glowstone','Jack o\'Lantern','Nether Brick Fence','Sunflower']
};

const MENU_WOOLS = {
	'ja'     : ['羊毛','白色の羊毛','だいだい色の羊毛','赤むらさき色の羊毛','水色の羊毛','黄色の羊毛','黄緑色の羊毛','もも色の羊毛','灰色の羊毛','うすい灰色の羊毛','空色の羊毛','むらさき色の羊毛','青色の羊毛','茶色の羊毛','緑色の羊毛','赤色の羊毛','黒色の羊毛'],
	'ja-Hira': ['ようもう','しろいろのようもう','だいだいいろのようもう','あかむらさきいろのようもう','みずいろのようもう','きいろのようもう','きみどりいろのようもう','ももいろのようもう','はいいろのようもう','うすいはいいろのようもう','そらいろのようもう','むらさきいろのようもう','あおいろのようもう','ちゃいろのようもう','みどりいろのようもう','あかいろのようもう','くろいろのようもう'],
	'en'     : ['Wool','White Wool','Orange Wool','Magenta Wool','Light Blue Wool','Yellow Wool','Lime Wool','Pink Wool','Gray Wool','Light Gray Wool','Cyan Wool','Purple Wool','Blue Wool','Brown Wool','Green Wool','Red Wool','Black Wool']
};

const MENU_SGLASSS = {
	'ja'     : ['ステンドグラス','白色のステンドグラス','だいだい色のステンドグラス','赤むらさき色のステンドグラス','水色のステンドグラス','黄色のステンドグラス','黄緑色のステンドグラス','もも色のステンドグラス','灰色のステンドグラス','うすい灰色のステンドグラス','空色のステンドグラス','むらさき色のステンドグラス','青色のステンドグラス','茶色のステンドグラス','緑色のステンドグラス','赤色のステンドグラス','黒色のステンドグラス'],
	'ja-Hira': ['ステンドグラス','しろいろのステンドグラス','だいだいいろのステンドグラス','あかむらさきいろのステンドグラス','みずいろのステンドグラス','きいろのステンドグラス','きみどりいろのステンドグラス','ももいろのステンドグラス','はいいろのステンドグラス','うすいはいいろのステンドグラス','そらいろのステンドグラス','むらさきいろのステンドグラス','あおいろのステンドグラス','ちゃいろのステンドグラス','みどりいろのステンドグラス','あかいろのステンドグラス','くろいろのステンドグラス'],
	'en'     : ['Stained Glass','White Stained Glass','Orange Stained Glass','Magenta Stained Glass','Light Blue Stained Glass','Yellow Stained Glass','Lime Stained Glass','Pink Stained Glass','Gray Stained Glass','Light Gray Stained Glass','Cyan Stained Glass','Purple Stained Glass','Blue Stained Glass','Brown Stained Glass','Green Stained Glass','Red Stained Glass','Black Stained Glass']
};

const MENU_CARPETS = {
	'ja'     : ['カーペット','白色のカーペット','だいだい色のカーペット','赤むらさき色のカーペット','水色のカーペット','黄色のカーペット','黄緑色のカーペット','もも色のカーペット','灰色のカーペット','うすい灰色のカーペット','空色のカーペット','むらさき色のカーペット','青色のカーペット','茶色のカーペット','緑色のカーペット','赤色のカーペット','黒色のカーペット'],
	'ja-Hira': ['カーペット','しろいろのカーペット','だいだいいろのカーペット','あかむらさきいろのカーペット','みずいろのカーペット','きいろのカーペット','きみどりいろのカーペット','ももいろのカーペット','はいいろのカーペット','うすいはいいろのカーペット','そらいろのカーペット','むらさきいろのカーペット','あおいろのカーペット','ちゃいろのカーペット','みどりいろのカーペット','あかいろのカーペット','くろいろのカーペット'],
	'en'     : ['Carpet','White Carpet','Orange Carpet','Magenta Carpet','Light Blue Carpet','Yellow Carpet','Lime Carpet','Pink Carpet','Gray Carpet','Light Gray Carpet','Cyan Carpet','Purple Carpet','Blue Carpet','Brown Carpet','Green Carpet','Red Carpet','Black Carpet']
};

const MENU_MODE = {
	'ja'     : [{text: '有る', value: true}, {text: '無い', value: false}],
	'ja-Hira': [{text: 'ある', value: true}, {text: 'ない', value: false}],
	'en'     : [{text: 'Running', value: true}, {text: 'None', value: false}]
};
const FormSetMode = {
	'ja'     : 'ヘルパーが[MODE]モード',
	'ja-Hira': 'ヘルパーが[MODE]モード',
	'en'     : 'The helper is[MODE]'
};

const FormChat = {
	'ja'     : 'チャット[MSG]',
	'ja-Hira': 'チャット[MSG]',
	'en'     : 'chat[MSG]'
};

const FormChatMsgDefault = {
	'ja'     : 'こんにちは！',
	'ja-Hira': 'こんにちは！',
	'en'     : 'Hello!'
};

const FormPreSetBlockIdData = {
	'ja'     : '[BlockName]を置く 　x:[X] y:[Y] z:[Z]',
	'ja-Hira': '[BlockName]をおく 　x:[X] y:[Y] z:[Z]',
	'en'     : 'set a[BlockName] at x:[X] y:[Y] z:[Z]'
};

const FormPreSetBlocks = {
	'ja'     : '[BlockName]で埋め尽くす 　x:[X] y:[Y] z:[Z] 〜 　x:[X1] y:[Y1] z:[Z1]',
	'ja-Hira': '[BlockName]でうめつくす 　x:[X] y:[Y] z:[Z] 〜 　x:[X1] y:[Y1] z:[Z1]',
	'en'     : 'fill with[BlockName] from  x:[X] y:[Y] z:[Z] to  x:[X1] y:[Y1] z:[Z1]'
};

const FormTeleport = {
	'ja'     : 'テレポートする　 x:[X] y:[Y] z:[Z]',
	'ja-Hira': 'テレポートする　 x:[X] y:[Y] z:[Z]',
	'en'     : 'teleport to  x:[X] y:[Y] z:[Z]'
};

const FormResetHere = {
	'ja'     : '周囲をリセット',
	'ja-Hira': 'しゅういをリセット',
	'en'     : 'reset around the player'
};

const FormReset = {
	'ja'     : '原点でリセット',
	'ja-Hira': 'げんてんでリセット',
	'en'     : 'reset around  x:0 y:0 z:0'
};

const FormGetPlayerPos = {
	'ja'     : '自分の位置を調べる',
	'ja-Hira': 'じぶんのいちをしらべる',
	'en'     : "get player's position"
};

const FormGetBlockInfo = {
	'ja'     : 'ブロックを調べる  x:[X] y:[Y] z:[Z]',
	'ja-Hira': 'ブロックをしらべる  x:[X] y:[Y] z:[Z]',
	'en'     : "get block ID & Data at  x:[X] y:[Y] z:[Z]"
};

const FormGetPlayerRotPit = {
	'ja'     : '自分の向きを調べる',
	'ja-Hira': 'じぶんのむきをしらべる',
	'en'     : "get player's rotation and pitch"
};

const FormSetPlayerRotPit = {
	'ja'     : '向きを右へ[Rot]° 下へ[Pit]° に設定する',
	'ja-Hira': 'むきをみぎへ[Rot]° したへ[Pit]° にせっていする',
	'en'     : "set player's rotation:[Rot]° and pitch:[Pit]°"
};

const FormConnectServer = {
	'ja'     : 'サーバーを変更  ホスト:[HOST]',
	'ja-Hira': 'サーバーをへんこう  ホスト:[HOST]',
	'en'     : "change the server to[HOST]"
};

const FormBlockIdText = {
	'ja'     : 'ブロックのID',
	'ja-Hira': 'ブロックのID',
	'en'     : "block ID"
};

const FormBlockDataText = {
	'ja'     : 'ブロックの値',
	'ja-Hira': 'ブロックのあたい',
	'en'     : "block Data"
};

const FormPos_XText = {
	'ja'     : '自分のＸ座標',
	'ja-Hira': 'じぶんのＸざひょう',
	'en'     : "x of the player"
};

const FormPos_YText = {
	'ja'     : '自分のＹ座標',
	'ja-Hira': 'じぶんのＹざひょう',
	'en'     : "y of the player"
};

const FormPos_ZText = {
	'ja'     : '自分のＺ座標',
	'ja-Hira': 'じぶんのＺざひょう',
	'en'     : "z of the player"
};

const FormPitchText = {
	'ja'     : '自分の角度（下向き）',
	'ja-Hira': 'じぶんのかくど（したむき）',
	'en'     : "pitch of the player"
};

const FormRotationText = {
	'ja'     : '自分の角度（右向き）',
	'ja-Hira': 'じぶんのかくど（みぎむき）',
	'en'     : "rotation of the player"
};

const FormStatusText = {
	'ja'     : '状態',
	'ja-Hira': 'じょうたい',
	'en'     : "status"
};

// --- Only With Helper below ---

const MENU_ROT = {
	'ja'     : [{text: '北', value: '北'},{text: '北東', value: '北東'},{text: '東', value: '東'},{text: '南東', value: '南東'},{text: '南', value: '南'},{text: '南西', value: '南西'},{text: '西', value: '西'},{text: '北西', value: '北西'}],
	'ja-Hira': [{text: 'きた', value: '北'},{text: 'ほくとう', value: '北東'},{text: 'ひがし', value: '東'},{text: 'なんとう', value: '南東'},{text: 'みなみ', value: '南'},{text: 'なんせい', value: '南西'},{text: 'にし', value: '西'},{text: 'ほくせい', value: '北西'}],
	'en'     : [{text: 'N', value: '北'},{text: 'NE', value: '北東'},{text: 'E', value: '東'},{text: 'SE', value: '南東'},{text: 'S', value: '南'},{text: 'SW', value: '南西'},{text: 'W', value: '西'},{text: 'NW', value: '北西'}]
};

const MENU_PITCH = {
	'ja'     : [{text: '真上', value: '真上'},{text: '斜め上45°', value: '斜め上45°'},{text: '水平', value: '水平'},{text: '斜め下45°', value: '斜め下45°'},{text: '真下', value: '真下'}],
	'ja-Hira': [{text: 'まうえ', value: '真上'},{text: 'ななめうえ45°', value: '斜め上45°'},{text: 'すいへい', value: '水平'},{text: 'ななめした45°', value: '斜め下45°'},{text: 'ました', value: '真下'}],
	'en'     : [{text: 'Above', value: '真上'},{text: 'upper 45°', value: '斜め上45°'},{text: 'Horizontally', value: '水平'},{text: 'lower 45°', value: '斜め下45°'},{text: 'Below', value: '真下'}]
};

const Dic_Rot = {"北":270,"北東":315,"東":0,"南東":45,"南":90,"南西":135,"西":180,"北西":225};
const Dic_Pitch = {"真上":-90,"斜め上45度":-45,"水平":0,"斜め下45度":45,"真下":90};

const FormSetPen = {
	'ja'     : 'ペンを設定する |  位置を  x:[X] y:[Y] z:[Z]  方角を[Rot]、 傾きを[Pit]  にする |  ヘルパー',
	'ja-Hira': 'ペンをせっていする |  いちを  x:[X] y:[Y] z:[Z]) ほうがくを[Rot]、 かたむきを[Pit]  にする |  ヘルパー',
	'en'     : 'set pen at  x:[X] y:[Y] z:[Z] in the direction:[Rot], pitch:[Pit]|  helper'
};

const FormDownPen = {
	'ja'     : 'ペンを下ろす |  ブロック:[BlockName]|  ヘルパー',
	'ja-Hira': 'ペンのおろす |  ブロック:[BlockName]|  ヘルパー',
	'en'     : 'pen down as[BlockName]|  helper'
};

const FormStrokePen = {
	'ja'     : 'ペンを進める |  長さ:[Length]|  ヘルパー',
	'ja-Hira': 'ペンをすすめる |  ながさ:[Length]|  ヘルパー',
	'en'     : 'forward pen to distance:[Length]|  helper'
};

const FormTurnPen = {
	'ja'     : 'ペンの向きを変える |  さらに 右へ[Rot]°  下へ[Pit]°  傾ける |  ヘルパー',
	'ja-Hira': 'ペンのむきをかえる |  さらに みぎへ[Rot]°  したへ[Pit]°  かたむける |  ヘルパー',
	'en'     : 'tuen pen to rotation:[Rot]° pitch:[Pit]° |  helper'
};

const FormUpPen = {
	'ja'     : 'ペンを上げる |  ヘルパー',
	'ja-Hira': 'ペンをあげる |  ヘルパー',
	'en'     : 'pen up |  helper'
};

const MENU_FONTS = ['8x8','10pt','10ptbold','6pt','6ptmono','7pt','9pt','9ptbold','architectlg','architectsm','bigfoot','casual','casualbold','macfont','mactall','metrix7pt','nicefont','nicefontbold','palmboldeu','palmnormeu','pda','pdabold','script','squat11pt','squat8pt','squatcaps8pt','tallfont','thin11pt','thin9pt'];

const MENU_YESNO = {
	'ja'     : [{text: 'はい', value: true}, {text: 'いいえ', value: false}],
	'ja-Hira': [{text: 'はい', value: true}, {text: 'いいえ', value: false}],
	'en'     : [{text: 'Yes', value: true}, {text: 'No', value: false}]
};

const FormSetBlockIdData = {
	'ja'     : '１つ置く |  ブロック ID:[ID] 値:[Data] |  座標  x:[X] y:[Y] z:[Z]|  ヘルパー',
	'ja-Hira': '１つおく |  ブロック ID:[ID] あたい:[Data] |  ざひょう  x:[X] y:[Y] z:[Z]|  ヘルパー',
	'en'     : 'set a block as ID:[ID] Data:[Data] at  x:[X] y:[Y] z:[Z]|  helper'
};

const FormPreDrawLine = {
	'ja'     : '[BlockName]の直線 　x:[X] y:[Y] z:[Z] 〜 　x:[X1] y:[Y1] z:[Z1] |  ヘルパー',
	'ja-Hira': '[BlockName]のちょくせん 　ざひょう 　x:[X] y:[Y] z:[Z] 〜 　x:[X1] y:[Y1] z:[Z1] |  ヘルパー',
	'en'     : 'draw a line of[BlockName] from  x:[X] y:[Y] z:[Z] to  x:[X1] y:[Y1] z:[Z1]|  helper'
};

const FormDrawLine = {
	'ja'     : '直線を描く |  ブロック ID:[ID] 値:[Data] |  座標  x:[X] y:[Y] z:[Z]〜 座標  x:[X1] y:[Y1] z:[Z1]|  ヘルパー',
	'ja-Hira': 'ちょくせんをえがく |  ブロック ID:[ID] あたい:[Data] |  ざひょう  x:[X] y:[Y] z:[Z]〜 ざひょう  x:[X1] y:[Y1] z:[Z1]|  ヘルパー',
	'en'     : 'draw a line |  block ID:[ID] Data:[Data] |  from  x:[X] y:[Y] z:[Z]to  x:[X1] y:[Y1] z:[Z1]|  helper'
};

const FormSetBlocks = {
	'ja'     : '直方体を描く |  ブロック ID:[ID] 値:[Data] |  座標  x:[X] y:[Y] z:[Z]〜 座標  x:[X1] y:[Y1] z:[Z1]|  ヘルパー',
	'ja-Hira': 'ちょくほうたいえがく |  ブロック ID:[ID] あたい:[Data] |  ざひょう  x:[X] y:[Y] z:[Z]〜 ざひょう  x:[X1] y:[Y1] z:[Z1]|  ヘルパー',
	'en'     : 'draw a cuboid |  block ID:[ID] Data:[Data] |  from  x:[X] y:[Y] z:[Z] to  x:[X1] y:[Y1] z:[Z1]|  helper'
};

const FormPreDrawText = {
	'ja'     : '[BlockName]の文字列[Text]|  背景:[BlockName1] |  フォント:[Font] x:[X] y:[Y] z:[Z]|  ヘルパー',
	'ja-Hira': '[BlockName]のもじれつ[Text]|  はいけい:[BlockName1] |  フォント:[Font] x:[X] y:[Y] z:[Z]|  ヘルパー',
	'en'     : 'Draw [Text] of[BlockName], background:[BlockName1], font:[Font] at  x:[X] y:[Y] z:[Z]|  helper'
}

const FormDrawText = {
	'ja'     : '文字列を描く |[Text]|  フォント:[Font]|  文字ブロック ID:[ID] 値:[Data] |  背景ブロック ID:[ID1] 値:[Data1] |  右へ[Rot]°  |  座標  x:[X] y:[Y] z:[Z]|  ヘルパー',
	'ja-Hira': 'もじれつをえがく |  [Text]|  フォント:[Font]|  もじブロック ID:[ID] あたい:[Data] |  はいけいブロック ID:[ID1] あたい:[Data1] |  みぎへ[Rot]°  |  ざひょう  x:[X] y:[Y] z:[Z]|  ヘルパー',
	'en'     : 'Draw [Text]|  font:[Font]|  block ID:[ID] Data:[Data]|  background ID:[ID1] Data:[Data1]|  rotation:[Rot]°  at  x:[X] y:[Y] z:[Z]|  helper'
}

const FormPreDrawCircle = {
	'ja'     : '円を描く |  ブロック:[BlockName]|  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  回転  下へ[Pit]° 右へ[Rot]° |  塗り潰す：[FR]|  ヘルパー',
	'ja-Hira': 'えんをえがく |  ブロック:[BlockName]|  はんけい:[R] |  ちゅうしん  x:[X] y:[Y] z:[Z] |  したへ[Pit]° みぎへ[Rot]° かいてん  |  ぬりつぶす：[FR]|  ヘルパー',
	'en'     : 'draw a circle of[BlockName] |  radius:[R], center at  x:[X] y:[Y] z:[Z] |  pitch:[Pit]°,  rotation:[Rot]° |  fill-up:[FR]|  helper'
};
const FormDrawCircle = {
	'ja'     : '円を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  回転  下へ[Pit]° 右へ[Rot]°  |  塗り潰す：[FR]|  ヘルパー',
	'ja-Hira': 'えんをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ぬりつぶす：[FR]|  ヘルパー',
	'en'     : 'draw a circle |  block ID:[ID] Data:[Data] |  radius[R], center at  x:[X] y:[Y] z:[Z] |  pitch:[Pit]°,  rotation:[Rot]° |  fill-up:[FR]|  helper'
};

const FormDrawArc = {
	'ja'     : '弧を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  開始:[Start]° 終了:[End]° |  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'こをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  はじめ:[Start]° おわり:[End]° |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw an arc |  block ID:[ID] Data:[Data] |  radius[R], center at  x:[X] y:[Y] z:[Z] |  start:[Start]°, end:[End]°|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawFan = {
	'ja'     : '扇を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  開始:[Start]° 終了:[End]° |  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'おうぎをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  はじめ:[Start]° おわり:[End]° |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw a fan |  block ID:[ID] Data:[Data] |  radius[R], center at  x:[X] y:[Y] z:[Z] |  start:[Start]°, end:[End]°|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawEllipse = {
	'ja'     : '楕円を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  Ｚ比率:[Ratio_Z] |  中心  x:[X] y:[Y] z:[Z] |  開始:[Start]° 終了:[End]° |  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'だえんをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] |  Ｚひりつ:[Ratio_Z] | ちゅうしん  x:[X] y:[Y] z:[Z] |  はじめ:[Start]° おわり:[End]° |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw an ellipse |  block ID:[ID] Data:[Data]|  radius[R]|  Z-ratio:[Ratio_Z]|  center at  x:[X] y:[Y] z:[Z]|  start:[Start]°, end:[End]°|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawEgg = {
	'ja'     : '卵の輪郭を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'たまごのりんかく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw an egg outline |  block ID:[ID] Data:[Data]|  radius[R]|  center at  x:[X] y:[Y] z:[Z]|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawBall = {
	'ja'     : '球を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  ヘルパー',
	'ja-Hira': 'きゅうをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  ヘルパー',
	'en'     : 'draw a ball |  block ID:[ID] Data:[Data]|  radius[R]|  center at  x:[X] y:[Y] z:[Z]|  helper'
};

const FormDrawBallPart = {
	'ja'     : '球の一部を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  偏角  xr:[Start_XR]° 〜[End_XR]°   zr:[Start_ZR]° 〜[End_ZR]|  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'きゅうのいちぶをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  へんかく  xr:[Start_XR]° 〜[End_XR]°   zr:[Start_ZR]° 〜[End_ZR]|  したへ[Pit]°  みぎへ[Rot]° かいてん |  ヘルパー',
	'en'     : 'draw a part of ball |  block ID:[ID] Data:[Data]|  radius[R],  center at  x:[X] y:[Y] z:[Z]|  x→r:[Start_XR]° 〜[End_XR]°   z→r:[Start_ZR]° 〜[End_ZR]|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawEggBall = {
	'ja'     : '卵を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  中心  x:[X] y:[Y] z:[Z] |  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'たまごをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] | ちゅうしん  x:[X] y:[Y] z:[Z] |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw an egg |  block ID:[ID] Data:[Data]|  radius[R]|  center at  x:[X] y:[Y] z:[Z]|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawEllipseBall = {
	'ja'     : '楕円体を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  Ｙ比率:[Ratio_Y] Ｚ比率:[Ratio_Z] |  中心  x:[X] y:[Y] z:[Z] |  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'だえんたいをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] |  Ｙひりつ:[Ratio_Y] Ｚひりつ:[Ratio_Z] | ちゅうしん  x:[X] y:[Y] z:[Z] |  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw an ellipse ball |  block ID:[ID] Data:[Data]|  radius[R]|  Y-ratio:[Ratio_Y], Z-ratio:[Ratio_Z]|  center at  x:[X] y:[Y] z:[Z]|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDrawEllipseBallPart = {
	'ja'     : '楕円体の一部を描く |  ブロック ID:[ID] 値:[Data] |  半径:[R] |  Ｙ比率:[Ratio_Y] Ｚ比率:[Ratio_Z] |  中心  x:[X] y:[Y] z:[Z] |  偏角  xr:[Start_XR]° 〜[End_XR]°   zr:[Start_ZR]° 〜[End_ZR]|  回転  下へ[Pit]° 右へ[Rot]°  |  ヘルパー',
	'ja-Hira': 'だえんたいのいちぶをえがく |  ブロック ID:[ID] あたい:[Data] |  はんけい:[R] |  Ｙひりつ:[Ratio_Y] Ｚひりつ:[Ratio_Z] | ちゅうしん  x:[X] y:[Y] z:[Z] |  へんかく  xr:[Start_XR]° 〜[End_XR]°   zr:[Start_ZR]° 〜[End_ZR]|  したへ[Pit]°  みぎへ[Rot]° かいてん  |  ヘルパー',
	'en'     : 'draw a part of ellipse ball |  block ID:[ID] Data:[Data]|  radius[R]|  Y-ratio:[Ratio_Y], Z-ratio:[Ratio_Z]|  center at  x:[X] y:[Y] z:[Z]|  x→r:[Start_XR]° 〜[End_XR]°   z→r:[Start_ZR]° 〜[End_ZR]|  pitch:[Pit]°,  rotation:[Rot]° |  helper'
};

const FormDoSomething = {
	'ja'     : 'オリジナル処理をする[Args]',
	'ja-Hira': 'オリジナルしょりをする[Args]',
	'en'     : 'your original function[Args]'
};

const FormDoSomethingMsgDefault = {
	'ja'     : '処理に渡す数や文字',
	'ja-Hira': 'しょりに わたす かず や もじ',
	'en'     : 'number or string to pass to your function'
};


// ----------
// Status Messages
// ----------

// success
const constOK_Done = {
	'ja'     : "成功",
	'ja-Hira': "せいこう",
	'en'     : "OK"
};

// error of server-down
const constErrNone = {
	'ja'     : "失敗： ヘルパーが無いか、応答しません",
	'ja-Hira': "しっぱい： ヘルパーがないか、おうとうしません",
	'en'     : "Error： The helper doesn't exist or fails to reply."
};

const constErrNoImptlemented= {
	'ja'     : "失敗： ヘルパーが有るモードで実行してください",
	'ja-Hira': "しっぱい： ヘルパーがあるモードでじっこうしてください",
	'en'     : "Error： This requires the helper."
};

const constErrSock = {
	'ja'     : '失敗： マインクラフトが応答しません',
	'ja-Hira': 'しっぱい： マインクラフトがおうとうしません',
	'en'     : "Error： Minecraft doesn't reply."
};

const constErrType = {
	'ja'     : '失敗： 無効な値です',
	'ja-Hira': 'しっぱい： むこうなあたいです',
	'en'     : "Error： Invalid value."
};

const c_HelperHost = "http://localhost:12345/";
const serverTimeoutMs = 10000; // 10 seconds (chosen arbitrarily).
const HOST_DEFAULT = 'localhost'
const PORT_HELPER_OFF = '14711';
const PORT_HELPER_ON  = '4711';
const RETRY_MAX = 10;

class MicraWorld {
	constructor (mode, locale) {
		/**
		* The Mode whether this extension needs the helper "scratchserver.py" or not.
		* 	true :  need "scratchserver.py" and all blocks can work.
		* 	false:  don't need "scratchserver.py" but it's only some basical blocks that can work.
		*/
		this._Mode_WithHelper = mode;

		/**
		* Now locale, only 3 mode supported: "ja", "ja-Hira" and "en".
		*/
		this._locale = locale;

		/**
		* Statuses of the minecraft world connected.
		*/
		this.r_status="0";
		this.r_pos_x=0;
		this.r_pos_y=0;
		this.r_pos_z=0;
		this.r_blockId=0;
		this.r_blockData=0;
		this.r_rotation=0;
		this.r_pitch=0;

		/**
		* Statuses of the Pen in the minecraft world connected.
		*/
		this.pen_x=0;
		this.pen_y=0;
		this.pen_z=0;
		this.pen_turn=0;
		this.pen_pitch=0;
		this.pen_block_id=0;
		this.pen_block_data=0;
		this.pen_down=false;

		/**
		* The Direct Connecter to "raspberryjammod" which is installed as a mod of the minecraft
		*  so that this extension can works without the helper "scratchserver.py".
		*/
		this._McSocket = null;
		this._connected = false;
		this._SocketRetryCount = 0;
		this._McServerHost = HOST_DEFAULT;
		if(!this._Mode_WithHelper){
			this._initSocket(this._McServerHost);
		}
		this._FunctionQueue = [];

	}

	/**
	* Controler of WebSocket, which works without helper "scratchserver.py".
	*/

	_initSocket (host) {
		if (this._McSocket == null) {
			this._connected = false;
			this._SocketRetryCount++;
			if( RETRY_MAX < this._SocketRetryCount ){
				console.log("socket error: retry over");
				this.r_status=constErrSock[this._locale];
				this._FunctionQueue = [];
				return;
			}
			let uri = "ws://"+host+":"+PORT_HELPER_OFF;
			this._McSocket = new WebSocket(uri);
			this._McSocket.onopen = this._onOpen.bind(this);
			this._McSocket.onmessage = this._onMessage.bind(this);
			this._McSocket.onclose = this._onClose.bind(this);
			this._McSocket.onerror = this._onError.bind(this);
		}
		this._McServerHost = host;
	}

	_onOpen () {
		console.log("socket open");
		this._connected = true;
		this._FunctionQueue = [];
		this._SocketRetryCount = 0;
		this.r_status = constOK_Done[this._locale];
	}

	_onMessage (event) {
		if (event && event.data) {
			if(event.data=="Fail"){
				this.r_status=constErrType[this._locale];
			}
			if( 0<this._FunctionQueue.length && typeof this._FunctionQueue[0]!="undefined" && this._FunctionQueue[0]!=null){
				this._FunctionQueue[0](this, event.data);
				this._FunctionQueue.shift();
			}
		}
	}

	_onClose (event) {
		this._McSocket = null;
		this._connected = false;
		this._FunctionQueue = [];
	}

	_onError (event) {
		if( RETRY_MAX < this._SocketRetryCount ){
			console.log("socket error: retry over");
		} else {
			console.log("socket error");
		}
		this.r_status=constErrSock[this._locale];
		this._McSocket = null;
		this._connected = false;
		this._FunctionQueue = [];
	}

	_SocketSend (cmd) {
		if( RETRY_MAX < this._SocketRetryCount ){
			console.log("socket error: retry over");
			return;
		}
		if(!this._connected){
			this._McSocket=null;
			this._initSocket(this._McServerHost);
			window.setTimeout( function (cmd) {
				if(!this._connected){
					this.r_status=constErrSock[this._locale];
					console.log("_SocketSend: session error. Socket is not open.");
				} else {
					this._McSocket.send(cmd);
					this.r_status = constOK_Done[this._locale];
				}
			}.bind(this, cmd), 500);
		} else {
			if(cmd){
				this._McSocket.send(cmd);
				this.r_status = constOK_Done[this._locale];
			} else {
				console.log("_SocketSend: command format error");
				this.r_status=constErrType[this._locale];
			}
		}
	}

	_SocketSendReceive (cmd, callback) {
		if( RETRY_MAX < this._SocketRetryCount ){
			console.log("socket error: retry over");
			return;
		}
		if(!this._connected){
			this._McSocket=null;
			this._initSocket(this._McServerHost);
			window.setTimeout( function (cmd) {
				if(!this._connected){
					this.r_status=constErrSock[this._locale];
					console.log("_SocketSend: session error. Socket is not open.");
				} else {
					this._FunctionQueue.push(callback);
					this._McSocket.send(cmd);
				}
			}.bind(this, cmd), 500);
		} else {
			this._FunctionQueue.push(callback);
			this._McSocket.send(cmd);
		}
	}

	// Set error status
	_setErrorMsg (msg, locale) {
		let err = "";
		// switch by helper's message, which is japanese
		switch (msg) {
			case '失敗：マインクラフトが応答しません':
				err = constErrSock[locale];
				break;
			case '失敗：型エラー':
				err = constErrType[locale];
				break;
			case '成功':
				err = constOK_Done[locale];
				break;
		}
		return err;
	}

	/**
	* Send a command to the minecraft world through the helper "scratchserver.py".
	*/
	_send (command, params) {
		let urlBase = "";
		if (params === null) {
			urlBase = c_HelperHost+command;
		} else {
			urlBase = c_HelperHost+command+"/"+params;
		}
		nets({
			url: urlBase,
			method: "GET",
			headers: {
				"Content-Type": "text/plain"
			},
			encoding: undefined,
			timeout: serverTimeoutMs
		}, (err, res, body) => {
			if (err) {
				this.r_status=constErrNone[this._locale];
				this._connected=false;
				return constErrNone[this._locale];
			}
			this.r_status=constOK_Done[this._locale];
			switch(command){
				case 'getPlayerPos':
					this._setCoordinateData(body);
					break;
				case 'getBlockInfo':
					this._setBlockInfoData(body);
					break;
				case 'getPlayerRotPit':
					this._setRotPitData(body);
					break;
				default:
					let msg=body.split(" ");
					this.r_status=this._setErrorMsg(msg[1], this._locale);
					break;
			}
			return body;
		});
	}

	_connectServer () {
		if(this._Mode_WithHelper){
			console.log("conectServer: With Helper Mode");
			this._send("Disconnect", null);
			if(this._McSocket){
				this._connected = false;
				this._McSocket.close();
			}
			let plm = this._McServerHost +"/"+ PORT_HELPER_ON;
			this._send("ConnectServer", plm);
		} else {
			console.log("conectServer: Without Helper Mode");
			this._SocketRetryCount = 0;
			this._initSocket(this._McServerHost);
		}
	}

	ConnectServer (host) {
		this._McServerHost = host;
		this._connectServer();
	}

	setHelperMode_ON () {
		this._Mode_WithHelper = true;
		this._connectServer();
	}
	setHelperMode_OFF () {
		this._Mode_WithHelper = false;
		this._connectServer();
	}

	Chat (msg) {
		if(this._Mode_WithHelper){
			this._send("Chat", msg);
		} else {
			this._SocketSend("chat.post("+msg+")");
		}
	}

	/**
	* get the coordinate of the player from the minecraft world .
	*/
	getPlayerPos () {
		if(this._Mode_WithHelper){
			// to "scratchserver.py"
			this._send("getPlayerPos", null);
		} else {
			// to socket direct
			this._SocketSendReceive("player.getTile()", function(that, msg){
				var args = msg.trim().split(",");
				that.r_pos_x=Math.round(parseFloat(args[0]));
				that.r_pos_y=Math.round(parseFloat(args[1]));
				that.r_pos_z=Math.round(parseFloat(args[2]));
				that.r_status = constOK_Done[that._locale];
			});
		}
	}

	_setCoordinateData (str) {
		let vlist = str.split("\n");
		for (let i = 0 ; i < vlist.length ; i++){
			let data = vlist[i].split(" ");
			switch(data[0]){
				case '_problem':
					this.r_status=this._setErrorMsg(data[1], this._locale);
					break;
				case 'pos_x':
					this.r_pos_x=parseInt(data[1],10);
					break;
				case 'pos_y':
					this.r_pos_y=parseInt(data[1],10);
					break;
				case 'pos_z':
					this.r_pos_z=parseInt(data[1],10);
					break;
			}
		}
	}

	_SocketGetPlayerRotation () {
		this._SocketSendReceive("player.getRotation()", function(that, msg){
			var args = msg.trim().split(",");
			that.r_rotation = Math.round(parseFloat(args[0]));
			that.r_status = constOK_Done[that._locale];
		});
	}

	_SocketGetPlayerPitch () {
		this._SocketSendReceive("player.getPitch()", function(that, msg){
			var args = msg.trim().split(",");
			that.r_pitch = Math.round(parseFloat(args[0]));
			that.r_status = constOK_Done[that._locale];
		});
	}

	/**
	* get the Rotation and Pitch of the player from the minecraft world.
	*/
	getPlayerRotPit () {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("getPlayerRotPit", null);
		} else {
			// to socket direct
			this._SocketGetPlayerRotation();
			this._SocketGetPlayerPitch();
		}
	}

	_setRotPitData (str) {
		let vlist = str.split("\n");
		for (let i = 0 ; i < vlist.length ; i++){
			let data = vlist[i].split(" ");
			switch(data[0]){
				case '_problem':
					this.r_status=this._setErrorMsg(data[1], this._locale);
					break;
				case 'rotation':
					this.r_rotation=Math.round(parseFloat(data[1]));
					break;
				case 'pitch':
					this.r_pitch=Math.round(parseFloat(data[1]));
					break;
			}
		}
	}

	/**
	* get the Block-ID and Block-Data at the coordinate (x,y,z) from the minecraft world.
	*/
	getBlockInfo (x,y,z) {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("getBlockInfo", [x,y,z].join("/"));
		} else {
			// to socket direct
			var prm = [x,y,z].join();
			let cmd = "world.getBlockWithData(" + prm + ")";
			this._SocketSendReceive(cmd, function(that, msg){
				var args = msg.trim().split(",");
				that.r_blockId = parseInt(args[0],10);
				that.r_blockData = parseInt(args[1],10);
				that.r_status = constOK_Done[that._locale];
			});
		}
	}

	_setBlockInfoData (str) {
		let vlist = str.split("\n");
		for (let i = 0 ; i < vlist.length ; i++){
			let data = vlist[i].split(" ");
			switch(data[0]){
				case '_problem':
					this.r_status=this._setErrorMsg(data[1], this._locale);
					break;
				case 'blockId':
					this.r_blockId=parseInt(data[1],10);
					break;
				case 'blockData':
					this.r_blockData=parseInt(data[1],10);
					break;
			}
		}
	}

	/**
	* set a Block at the coordinate (x,y,z) in the minecraft world.
	*/
	setBlockData (id,data,x,y,z) {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("setBlockData", [id,data,x,y,z].join("/"));
		} else {
			// to socket direct
			var prm = [x,y,z,id,data].join();
			this._SocketSend("world.setBlock(" + prm + ")");
		}
	}

	/**
	* set Blocks as a cuboid, which diagonal line is defined from (x,y,z) to (x1,y1,z1) in the minecraft world.
	*/
	setBlocks (id,data,x,y,z,x1,y1,z1) {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("setBlocks", [id,data,x,y,z,x1,y1,z1].join("/"));
		} else {
			// to socket direct
			var prm = [x,y,z,x1,y1,z1,id,data].join();
			this._SocketSend("world.setBlocks(" + prm + ")");
		}
	}

	/**
	* set player's rotation and pitch in the minecraft world.
	*/
	setPlayerRotPit (rot, pit) {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("setPlayerRotPit", [rot, pit].join("/"));
		} else {
			// to socket direct
			this._SocketSend("player.setRotation(" + rot + ")");
			this._SocketSend("player.setPitch(" + pit + ")");
		}
	}

	drawLine (id,data,x,y,z,x1,y1,z1) {
		// validation
/*
		let nid=parseInt(id,10);
		let ndata=parseInt(data,10);
		let nx=parseInt(x,10);
		let ny=parseInt(y,10);
		let nz=parseInt(z,10);
		let nx1=parseInt(x1,10);
		let ny1=parseInt(y1,10);
		let nz1=parseInt(z1,10);
*/
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			//this._send("drawLine", [nid, ndata, nx, ny, nz, nx1, ny1, nz1].join("/"));
			this._send("drawLine", [id,data,x,y,z,x1,y1,z1].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	/**
	* draw a Circle in the minecraft world.
	*/
	drawCircle (id, data, r, x, y, z, pit, rot, fr) {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			if(fr){
				this._send("drawEllipse", [id, data, r, 1.0, x, y, z, 0, 360, pit, rot].join("/"));
			} else {
				this._send("drawCircle", [id, data, r, x, y, z, pit, rot].join("/"));
			}
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	/**
	* Teleport the player to (x,y,z) in the minecraft world.
	*/
	Teleport (x,y,z) {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("Teleport", [x,y,z].join("/"));
		} else {
			// to socket direct
			var prm = [x,y,z].join();
			this._SocketSend("player.setPos(" + prm + ")");
		}
	}

	/**
	* Reset around the player to the flat land in the minecraft world.
	*/
	ResetHere () {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("ResetHere", null);
		} else {
			// to socket direct
			this.getPlayerPos();
			var id = window.setTimeout( function () {
				let x = this.r_pos_x;
				let y = this.r_pos_y;
				let z = this.r_pos_z;
				let prm = [];
				if(y >= 50){
					prm = [x-50, y-50, z-50, x+50, y+50, z+50, 0, 0].join();
					this._SocketSend("world.setBlocks(" + prm + ")");
				} else if(y > -51 && y < 50){
					prm = [x-50, 0, z-50, x+50, y+50, z+50, 0, 0].join();
					this._SocketSend("world.setBlocks(" + prm + ")");
					if(y <= 49){
						prm = [x-50, -1, z-50, x+50, -1, z+50, 2, 0].join();
						this._SocketSend("world.setBlocks(" + prm + ")");
					}
					if(y <= 48){
						prm = [x-50, y-50, z-50, x+50, -2, z+50, 1, 0].join();
						this._SocketSend("world.setBlocks(" + prm + ")");
					}
				} else if(y <= -52){
					prm = [x-50, y-50, z-50, x+50, y+50, z+50, 1, 0].join();
					this._SocketSend("world.setBlocks(" + prm + ")");
				} else {
					this._SocketSend("chat.post(cannot reset!)");
				}
				this._SocketSend("chat.post(reset here done!)");
			}.bind(this), 500);
		}
	}

	/**
	* Reset around (0,0,0) and make the player teleport there in the minecraft world.
	*/
	Reset () {
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("Reset", null);
		} else {
			// to socket direct
			this._SocketSend("world.setBlocks(" + [-100,0,-100,100,63,100,0,0].join() +")");
			this._SocketSend("world.setBlocks(" + [-100,-63,-100,100,-2,100,1,0].join() +")");
			this._SocketSend("world.setBlocks(" + [-100,-1,-100,100,-1,100,2,0].join() +")");
			this._SocketSend("player.setPos(0,0,0)");
			this._SocketSend("chat.post(reset done!)");
		}
	}

	/**
	* The series of functions for the Pen, like a turtle in the minecraft world.
	*/
	setPen (x, y, z, pit, rot) {
		// set params to the iner model
		this.pen_x=parseInt(x,10);
		this.pen_y=parseInt(y,10);
		this.pen_z=parseInt(z,10);
		this.pen_pit=Dic_Pitch[pit];
		this.pen_turn=Dic_Rot[rot];

		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("setPen", [x,y,z,rot,pit].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	downPen (id, data) {
		// set params to the iner model
		this.pen_block_id=parseInt(id,10);
		this.pen_block_data=parseInt(data,10);
		this.pen_down=true;

		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("downPen", [id,data].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	strokePen (len) {
		let r = parseInt(len,10);
		let rt = this.pen_turn*Math.PI/180;
		let rp = this.pen_pitch*Math.PI/180;
		let next_x = this.pen_x + Math.round(r*Math.cos(rp)*Math.cos(rt));
		let next_y = this.pen_y + Math.round(r*Math.sin(rp));
		let next_z = this.pen_z + Math.round(r*Math.cos(rp)*Math.sin(rt));

		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("strokePen", len.toString());
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
			// to socket direct
/*
			if(this.pen_down){
				this._drawLine(this.pen_block_id, this.pen_block_data, this.pen_x, this.pen_y, this.pen_z, next_x, next_y, next_z);
			}
*/
		}
		this.pen_x = next_x;
		this.pen_y = next_y;
		this.pen_z = next_z;
	}

	turnPen (pit, rot) {
		// set params to the iner model
		let tp = this.pen_pit + parseInt(pit,10);
		let tt = this.pen_turn + parseInt(rot,10);
		this.pen_pit = tp % 360;
		this.pen_turn = tt % 360;

		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("turnPen", [rot,pit].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	upPen () {
		// set params to the iner model
		this.pen_down = false;

		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("upPen", null);
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	drawText (str, font, id1, dat1, id2, dat2, deg, x, y, z) {
		// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawText", [str, font, id1, dat1, id2, dat2, deg, x, y, z].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}
	}

	drawEllipse (id, data, radius, ratio, x, y, z, st, en, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawEllipse", [id, data, radius, ratio, x, y, z, st, en, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawEllipseBall (id, data, radius, ratio_y, ratio_z, x, y, z, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawEllipseBall", [id, data, radius, ratio_y, ratio_z, x, y, z, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawEllipseBallPart (id, data, radius, ratio_y, ratio_z, x, y, z, st_xr, en_xr, st_zr, en_zr, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawEllipseBallPart", [id, data, radius, ratio_y, ratio_z, x, y, z, st_xr, en_xr, st_zr, en_zr, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawEgg (id, data, radius, x, y, z, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawEgg", [id, data, radius, x, y, z, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}


	drawEggBall (id, data, radius, x, y, z, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawEggBall", [id, data, radius, x, y, z, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawArc (id, data, radius, x, y, z, st, en, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawArc", [id, data, radius, x, y, z, st, en, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawArcRadis (id, data, radius, x, y, z, st, en, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawArcRadis", [id, data, radius, x, y, z, st, en, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawBall (id, data, radius, x, y, z){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawBall", [id, data, radius, x, y, z].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	drawBallPart (id, data, radius, x, y, z, st_xr, en_xr, st_zr, en_zr, pit, rot){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("drawBallPart", [id, data, radius, x, y, z, st_xr, en_xr, st_zr, en_zr, pit, rot].join("/"));
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

	doSomething (args){
			// set params to the iner model
		if(this._Mode_WithHelper){
			// to the helper "scratchserver.py"
			this._send("doSomething", args);
		} else {
			this.r_status=constErrNoImptlemented[this._locale];
		}	
	}

}


class Scratch3MicrammingBlocks {

	static get EXTENSION_ID () {
		return 'Micramming';
	}

	constructor (runtime) {
		this._locale = this._setLocale();
		this.runtime = runtime;
		this._my_rtn="";
		this.r_status  = "0";
		this._world = new MicraWorld(true, this._locale);
	}
 
	getInfo () {
		this._locale = this._setLocale();
		this._world._locale = this._locale;

	 	return {
			id: Scratch3MicrammingBlocks.EXTENSION_ID,
			name: EXTENSION_NAME[this._locale],
			blockIconURI: blockIconURI,
			blocks: [
				{
					opcode: 'SetMode',
					text: FormSetMode[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						MODE: {
							type: ArgumentType.STRING,
							menu: 'mode',
							defaultValue: MENU_MODE[this._locale][0].text,
							description: 'Mode'
						}
					}
				},
				{
					opcode: 'status',
					blockType: BlockType.REPORTER,
					text: FormStatusText[this._locale]
				},
				{
					opcode: 'Chat',
					text: FormChat[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						MSG: {
							type: ArgumentType.STRING,
							defaultValue: FormChatMsgDefault[this._locale],
							description: 'Chat Message'
						}
					}
				},
				{
					opcode: 'block_NameToID',
					blockType: BlockType.REPORTER,
					text: '[BlockName]',
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							menu: 'blocks',
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'red_NameToID',
					blockType: BlockType.REPORTER,
					text: '[BlockName]',
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							menu: 'reds',
							defaultValue: MENU_REDS[this._locale][5],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'deco_NameToID',
					blockType: BlockType.REPORTER,
					text: '[BlockName]',
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							menu: 'decos',
							defaultValue: MENU_DECOS[this._locale][5],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'wool_NameToID',
					blockType: BlockType.REPORTER,
					text: '[BlockName]',
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							menu: 'wools',
							defaultValue: MENU_WOOLS[this._locale][0],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'sglass_NameToID',
					blockType: BlockType.REPORTER,
					text: '[BlockName]',
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							menu: 'sglasss',
							defaultValue: MENU_SGLASSS[this._locale][0],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'carpet_NameToID',
					blockType: BlockType.REPORTER,
					text: '[BlockName]',
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							menu: 'carpets',
							defaultValue: MENU_CARPETS[this._locale][0],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'pre_setBlockData',
					text: FormPreSetBlockIdData[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'pre_drawLine',
					text: FormPreDrawLine[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						X1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X1'
						},
						Y1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y1'
						},
						Z1: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Coordinate Z1'
						}
					}
				},
				{
					opcode: 'pre_setBlocks',
					text: FormPreSetBlocks[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						X1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X1'
						},
						Y1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y1'
						},
						Z1: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Coordinate Z1'
						}
					}
				},
				{
					opcode: 'pre_drawText',
					text: FormPreDrawText[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						},
						Text: {
							type: ArgumentType.STRING,
							defaultValue: 'Great!',
							description: 'drawn text'
						},
						BlockName1: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][0],
							description: 'Block Name'
						},
						Font: {
							type: ArgumentType.STRING,
							menu: 'font',
							defaultValue: MENU_FONTS[0],
							description: 'Font Name'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'pre_drawCircle',
					text: FormPreDrawCircle[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						},
						FR: {
							type: ArgumentType.STRING,
							menu: 'yesno',
							defaultValue: MENU_YESNO[this._locale][0].text,
							description: 'Whether fill up'
						}
					}
				},
				{
					opcode: 'Teleport',
					text: FormTeleport[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'setPlayerRotPit',
					text: FormSetPlayerRotPit[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						}
					}
				},
				{
					opcode: 'setPen',
					blockType: BlockType.COMMAND,
					text: FormSetPen[this._locale],
					arguments: {
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Pit: {
							type: ArgumentType.STRING,
							menu: 'pitches',
							defaultValue: MENU_PITCH[this._locale][2].text,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.STRING,
							menu: 'rotations',
							defaultValue: MENU_ROT[this._locale][4].text,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'downPen',
					blockType: BlockType.COMMAND,
					text: FormDownPen[this._locale],
					arguments: {
						BlockName: {
							type: ArgumentType.STRING,
							defaultValue: MENU_BLOCKS[this._locale][1],
							description: 'Block Name'
						}
					}
				},
				{
					opcode: 'strokePen',
					text: FormStrokePen[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						Length: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'distance'
						}
					}
				},
				{
					opcode: 'turnPen',
					blockType: BlockType.COMMAND,
					text: FormTurnPen[this._locale],
					arguments: {
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 30,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'upPen',
					blockType: BlockType.COMMAND,
					text: FormUpPen[this._locale]
				},
				{
					opcode: 'ResetHere',
					blockType: BlockType.COMMAND,
					text: FormResetHere[this._locale]
				},
				{
					opcode: 'Reset',
					blockType: BlockType.COMMAND,
					text: FormReset[this._locale]
				},
				{
					opcode: 'getBlockInfo',
					blockType: BlockType.COMMAND,
					text: FormGetBlockInfo[this._locale],
					arguments: {
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'blockId',
					blockType: BlockType.REPORTER,
					text: FormBlockIdText[this._locale]
				},
				{
					opcode: 'blockData',
					blockType: BlockType.REPORTER,
					text: FormBlockDataText[this._locale]
				},
				{
					opcode: 'getPlayerPos',
					blockType: BlockType.COMMAND,
					text: FormGetPlayerPos[this._locale]
				},
				{
					opcode: 'pos_x',
					blockType: BlockType.REPORTER,
					text: FormPos_XText[this._locale]
				},
				{
					opcode: 'pos_y',
					blockType: BlockType.REPORTER,
					text: FormPos_YText[this._locale]
				},
				{
					opcode: 'pos_z',
					blockType: BlockType.REPORTER,
					text: FormPos_ZText[this._locale]
				},
				{
					opcode: 'getPlayerRotPit',
					blockType: BlockType.COMMAND,
					text: FormGetPlayerRotPit[this._locale]
				},
				{
					opcode: 'pitch',
					blockType: BlockType.REPORTER,
					text: FormPitchText[this._locale]
				},
				{
					opcode: 'rotation',
					blockType: BlockType.REPORTER,
					text: FormRotationText[this._locale]
				},
				{
					opcode: 'ConnectServer',
					text: FormConnectServer[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						HOST: {
							type: ArgumentType.STRING,
							defaultValue: HOST_DEFAULT,
							description: 'host name'
						}
					}
				},
				{
					opcode: 'setBlockData',
					text: FormSetBlockIdData[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'drawLine',
					text: FormDrawLine[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						X1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X1'
						},
						Y1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y1'
						},
						Z1: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Coordinate Z1'
						}
					}
				},
				{
					opcode: 'setBlocks',
					text: FormSetBlocks[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						X1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X1'
						},
						Y1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y1'
						},
						Z1: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Coordinate Z1'
						}
					}
				},
				{
					opcode: 'drawText',
					text: FormDrawText[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						ID1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Air'
						},
						Data1: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Air'
						},
						Text: {
							type: ArgumentType.STRING,
							defaultValue: 'Great!',
							description: 'drawn text'
						},
						Font: {
							type: ArgumentType.STRING,
							menu: 'font',
							defaultValue: MENU_FONTS[0],
							description: 'Font Name'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'drawCircle',
					text: FormDrawCircle[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						},
						FR: {
							type: ArgumentType.STRING,
							menu: 'yesno',
							defaultValue: MENU_YESNO[this._locale][0].text,
							description: 'Whether fill up'
						}
					}
				},
				{
					opcode: 'drawArc',
					text: FormDrawArc[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Start: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'start of theta range'
						},
						End: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'end of theta range'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawArcRadis',
					text: FormDrawFan[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Start: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'start of theta range'
						},
						End: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'end of theta range'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawEllipse',
					text: FormDrawEllipse[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						Ratio_Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 1.5,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Start: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'start of theta range'
						},
						End: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'end of theta range'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawEgg',
					text: FormDrawEgg[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawBall',
					text: FormDrawBall[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						}
					}
				},
				{
					opcode: 'drawBallPart',
					text: FormDrawBallPart[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Start_XR: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Range of XR'
						},
						End_XR: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'Range of XR'
						},
						Start_ZR: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Range of ZR'
						},
						End_ZR: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'Range of ZR'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawEggBall',
					text: FormDrawEggBall[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawEllipseBall',
					text: FormDrawEllipseBall[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						Ratio_Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0.5,
							description: 'Radius R'
						},
						Ratio_Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 1.5,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'drawEllipseBallPart',
					text: FormDrawEllipseBallPart[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						ID: {
							type: ArgumentType.NUMBER,
							defaultValue: 1,
							description: 'Stone'
						},
						Data: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Stone'
						},
						R: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Radius R'
						},
						Ratio_Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 0.5,
							description: 'Radius R'
						},
						Ratio_Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 1.5,
							description: 'Radius R'
						},
						X: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate X'
						},
						Y: {
							type: ArgumentType.NUMBER,
							defaultValue: 10,
							description: 'Coordinate Y'
						},
						Z: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Coordinate Z'
						},
						Start_XR: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Range of XR'
						},
						End_XR: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'Range of XR'
						},
						Start_ZR: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Range of ZR'
						},
						End_ZR: {
							type: ArgumentType.NUMBER,
							defaultValue: 180,
							description: 'Range of ZR'
						},
						Pit: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Pitch'
						},
						Rot: {
							type: ArgumentType.NUMBER,
							defaultValue: 0,
							description: 'Rotation'
						}
					}
				},
				{
					opcode: 'doSomething',
					text: FormDoSomething[this._locale],
					blockType: BlockType.COMMAND,
					arguments: {
						Args: {
							type: ArgumentType.STRING,
							defaultValue: FormDoSomethingMsgDefault[this._locale],
							description: 'args to pass'
						}
					}
				}

			],
			menus: {
					mode: MENU_MODE[this._locale],
					yesno: MENU_YESNO[this._locale],
				    font: MENU_FONTS,
					rotations: MENU_ROT[this._locale],
					pitches: MENU_PITCH[this._locale],
					blocks: MENU_BLOCKS[this._locale],
					reds: MENU_REDS[this._locale],
					decos: MENU_DECOS[this._locale],
					wools: MENU_WOOLS[this._locale],
					sglasss: MENU_SGLASSS[this._locale],
					carpets: MENU_CARPETS[this._locale]
			}

		}
	}


	_setLocale () {
		let now_locale = '';
		switch (formatMessage.setup().locale){
			case 'ja':
				now_locale='ja';
				break;
			case 'ja-Hira':
				now_locale='ja-Hira';
				break;
			case 'en':
				now_locale='en';
				break;
			default:
				now_locale='en';
				break;
		}
		return now_locale;
	}

	_nameToId (str) {
		for(let j in BLOCKS){
			for(let i=0; i<BLOCKS[j].length; i++){
				if(str == BLOCKS[j][i][2]){
					return [ BLOCKS[j][i][0], BLOCKS[j][i][1] ];
				}
			}
		}
		return [null, null];
	}

	block_NameToID (args) {
		return args.BlockName;
	}

	red_NameToID (args) {
		return args.BlockName;
	}

	deco_NameToID (args) {
		return args.BlockName;
	}

	wool_NameToID (args) {
		return args.BlockName;
	}

	sglass_NameToID (args) {
		return args.BlockName;
	}

	carpet_NameToID (args) {
		return args.BlockName;
	}

	SetMode (args) {
		if(!args.MODE || args.MODE == MENU_MODE[this._locale][1].text){
			this._world.setHelperMode_OFF();
		} else {
			this._world.setHelperMode_ON();
		}
	}

	Chat (args) {
		this._world.Chat(args.MSG);
	}

	setBlockData (args) {
		this._world.setBlockData (args.ID, args.Data, args.X, args.Y, args.Z);
	}

	pre_setBlockData (args) {
		let data = this._nameToId(args.BlockName);
		this.setBlockData({ID:data[0], Data:data[1], X:args.X, Y:args.Y, Z:args.Z});
	}

	setBlocks (args) {
		this._world.setBlocks(args.ID, args.Data, args.X, args.Y, args.Z, args.X1, args.Y1, args.Z1);
	}

	pre_setBlocks (args) {
		let data = this._nameToId(args.BlockName);
		this.setBlocks({ID:data[0], Data:data[1], X:args.X, Y:args.Y, Z:args.Z, X1:args.X1, Y1:args.Y1, Z1:args.Z1});
	}

	drawLine (args) {
		this._world.drawLine(args.ID, args.Data, args.X, args.Y, args.Z, args.X1, args.Y1, args.Z1);
	}

	pre_drawLine (args) {
		let data = this._nameToId(args.BlockName);
		this.drawLine({ID:data[0], Data:data[1], X:args.X, Y:args.Y, Z:args.Z, X1:args.X1, Y1:args.Y1, Z1:args.Z1});
	}

	drawCircle (args) {
		this._world.drawCircle(args.ID, args.Data, args.R, args.X, args.Y, args.Z, args.Pit, args.Rot, args.FR);
	}

	pre_drawCircle (args) {
		let data = this._nameToId(args.BlockName);
		this.drawCircle({ID:data[0], Data:data[1], R:args.R, X:args.X, Y:args.Y, Z:args.Z, Pit:args.Pit, Rot:args.Rot, FR:args.FR});
	}

	Teleport (args) {
		this._world.Teleport(args.X, args.Y, args.Z);
	}

	ResetHere (args) {
		this._world.ResetHere();
	}

	Reset (args) {
		this._world.Reset();
	}

	ConnectServer (args) {
		this._world.ConnectServer(args.HOST);
	}

	getPlayerPos () {
		this._world.getPlayerPos();
	}

	getBlockInfo (args) {
		this._world.getBlockInfo(args.X, args.Y, args.Z);
	}

	getPlayerRotPit () {
		this._world.getPlayerRotPit();
	}

	setPlayerRotPit (args) {
		this._world.setPlayerRotPit(args.Rot, args.Pit);
	}

	status () {
		return this._world.r_status;
	}

	blockId () {
		return this._world.r_blockId;
	}

	blockData () {
		return this._world.r_blockData;
	}

	pos_x () {
		return this._world.r_pos_x;
	}

	pos_y () {
		return this._world.r_pos_y;
	}

	pos_z () {
		return this._world.r_pos_z;
	}

	pitch () {
		return this._world.r_pitch;
	}

	rotation () {
		return this._world.r_rotation;
	}

	setPen (args) {
		return this._world.setPen(args.X, args.Y, args.Z, args.Pit, args.Rot);
	}

	downPen (args) {
		let data = this._nameToId(args.BlockName);
		return this._world.downPen(data[0], data[1]);
	}

	strokePen (args) {
		return this._world.strokePen(args.Length);
	}

	turnPen (args) {
		return this._world.turnPen(args.Pit, args.Rot);
	}

	upPen () {
		return this._world.upPen();
	}

	drawText (args) {
		return this._world.drawText(args.Text, args.Font, args.ID, args.Data, args.ID1, args.Data1, args.Rot, args.X, args.Y, args.Z);
	}

	pre_drawText (args) {
		let data = this._nameToId(args.BlockName);
		let data1 = this._nameToId(args.BlockName1);
		return this.drawText({Text:args.Text, Font:args.Font, X:args.X, Y:args.Y, Z:args.Z, Rot:0, ID:data[0], Data:data[1], ID1:data1[0], Data1:data1[1]});
	}

	drawArc (args) {
		this._world.drawArc(args.ID, args.Data, args.R, args.X, args.Y, args.Z, args.Start, args.End, args.Pit, args.Rot);
	}

	drawArcRadis (args) {
		this._world.drawArcRadis(args.ID, args.Data, args.R, args.X, args.Y, args.Z, args.Start, args.End, args.Pit, args.Rot);
	}

	drawEllipse (args) {
		this._world.drawEllipse(args.ID, args.Data, args.R, args.Ratio_Z, args.X, args.Y, args.Z, args.Start, args.End, args.Pit, args.Rot);
	}

	drawEgg (args) {
		this._world.drawEgg(args.ID, args.Data, args.R, args.X, args.Y, args.Z, args.Pit, args.Rot);
	}

	drawBall (args) {
		this._world.drawBall(args.ID, args.Data, args.R, args.X, args.Y, args.Z);
	}

	drawBallPart (args) {
		this._world.drawBallPart(args.ID, args.Data, args.R, args.X, args.Y, args.Z, args.Start_XR, args.End_XR, args.Start_ZR, args.End_ZR, args.Pit, args.Rot);
	}

	drawEggBall (args) {
		this._world.drawEggBall(args.ID, args.Data, args.R, args.X, args.Y, args.Z, args.Pit, args.Rot);
	}

	drawEllipseBall (args) {
		this._world.drawEllipseBall(args.ID, args.Data, args.R, args.Ratio_Y, args.Ratio_Z, args.X, args.Y, args.Z, args.Pit, args.Rot);
	}

	drawEllipseBallPart (args) {
		this._world.drawEllipseBallPart(args.ID, args.Data, args.R, args.Ratio_Y, args.Ratio_Z, args.X, args.Y, args.Z, args.Start_XR, args.End_XR, args.Start_ZR, args.End_ZR, args.Pit, args.Rot);
	}

	doSomething (args) {
		this._world.doSomething(args.Args);
	}

}
 
module.exports = Scratch3MicrammingBlocks;

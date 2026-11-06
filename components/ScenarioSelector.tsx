import React, { useState } from 'react';
import type { Scenario, Character, CharacterStats } from '../types';
import { CthulhuIcon } from './icons';

const combatRules = `
戦闘ルール:
1.  戦闘の開始: 戦闘が始まるときは、必ず game_event で type: 'combat_start' を発行し、details.enemies に敵のリスト（名前とHP）を含めてください。例: { "type": "combat_start", "details": { "enemies": [{"name": "狂信者", "hp": 8}, {"name": "深きもの", "hp": 12}] } }
2.  戦闘の進行: 戦闘はターン制です。プレイヤーが行動し、次いであなたがNPCと敵の行動を描写します。
3.  ダメージの報告:
    - プレイヤーがダメージを受けた場合、player_update.hp に負の値を設定します。
    - 敵がダメージを受けた場合、enemy_updates配列に、対象の敵の名前と負のhp_changeを含むオブジェクトを追加します。例: { "enemy_updates": [{"name": "狂信者", "hp_change": -5}] }
4.  戦闘の終了: 全ての敵が倒されるか、プレイヤーが全滅・逃走した場合、必ず game_event で type: 'combat_end' を発行して戦闘の終了を宣言してください。
`;

const baseRules = `
基本ルール:
1.  必ず指定されたJSONスキーマに従った有効なJSON形式で応答してください。
2.  場面の状況、環境、出来事を生き生きと描写してください。
3.  プレイヤーの行動に対して、その結果を判定してください。結果が不確かな場合は、技能チェックを要求してください。技能チェックを要求する際は、必ず物語の流れの中で「ここで【〇〇】の技能チェックが必要です」のようにプレイヤーに明確に伝えた上で、game_eventでskill_checkを発行してください。プレイヤーの同意なしに技能チェックイベントを自動的に発行してはいけません。
4.  NPCの役割を積極的に演じてください。NPCは単にプレイヤーの行動に反応するだけでなく、自らの意思で行動することがあります。プレイヤーに質問したり、自分のスキルに基づいた提案をしたり、恐怖や安堵などの感情を表現したりします。物語の区切りでは、プレイヤーの次の行動を促すため、「机を調べる」「本棚を調べる」「扉を開けてみる」といった具体的な選択肢を2〜3個提示することを推奨します。これにより、ゲームが円滑に進行します。
5.  プレイヤーとNPCのステータス（HP、正気度）を内部で追跡してください。
6.  物語の展開に応じて、正気度を失うような恐ろしい出来事を導入してください。
7.  日本語で応答してください。
8.  物語がプレイヤーの死亡、発狂、または目標達成によって明確に終了した場合は、必ず game_event の type を 'scenario_end' に設定し、結末を narrative で描写してください。
9.  プレイヤーがアイテムを発見したり失ったりした場合は、narrativeで描写し、player_updateのinventory_addまたはinventory_removeでアイテム名を正確に指定してください。
`;

const scenarios: Scenario[] = [
  {
    id: 'haunted_house',
    title: '呪われた屋敷',
    description: '街外れの古い屋敷から聞こえる奇妙な噂。あなたは調査のため、その不気味な屋敷の扉を開ける。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/haunted_house.mp3', title: 'Shadows of the Manor' },
    systemInstruction: `
今回のシナリオは「呪われた屋敷」です。古い洋館を舞台にした、古典的なゴシックホラーと探索の物語を演出してください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
  {
    id: 'missing_archeologist',
    title: '失踪した考古学者',
    description: '有名な考古学者が、古代遺跡の調査中に消息を絶った。彼が残した不可解な手記を手に、あなたはその謎を追う。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/missing_archeologist.mp3', title: 'Whispers of the Ancients' },
    systemInstruction: `
今回のシナリオは「失踪した考古学者」です。古代の謎と地球外の恐怖が絡み合う、冒険と調査が中心の物語を演出してください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
  {
    id: 'cyber_ghost',
    title: 'サイバーゴーストの囁き',
    description: '近未来都市で発生する謎の連続電子死事件。被害者は皆、特定のVRゲームのプレイヤーだった。あなたはサイバー空間に潜む見えざる脅威を追う。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/cyber_ghost.mp3', title: 'Digital Phantoms' },
    systemInstruction: `
今回のシナリオは「サイバーゴーストの囁き」です。サイバーパンクな近未来を舞台に、デジタルな恐怖と現実の脅威が交差する物語を演出してください。ハッキング、VR、サイバネティクスといった要素を積極的に取り入れてください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
  {
    id: 'steam_london',
    title: '霧と歯車のロンドン',
    description: '19世紀末、霧深いロンドン。謎の機械人形による連続殺人事件が発生。あなたは名探偵と共に、街に隠された巨大な陰謀を暴く。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/steam_london.mp3', title: 'Cogwheel Conspiracy' },
    systemInstruction: `
今回のシナリオは「霧と歯車のロンドン」です。19世紀末のスチームパンクなロンドンを舞台に、機械とオカルトが融合したミステリーを演出してください。蒸気機関、探偵、秘密結社などの要素を取り入れてください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
    {
    id: 'urban_legend_train',
    title: 'さまよう都市伝説',
    description: '「乗ると二度と帰れない」と噂される深夜の最終電車。失踪した友人を探すため、あなたはその都市伝説の真相に迫る。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/urban_legend_train.mp3', title: 'The Last Train' },
    systemInstruction: `
今回のシナリオは「さまよう都市伝説」です。現代日本を舞台に、身近に潜む都市伝説の恐怖を描写してください。日常が非日常に侵食されていくじっとりとした恐怖を演出してください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
  {
    id: 'everyday_horror',
    title: '歪む日常',
    description: '見慣れたはずの街、いつも通りの日常。しかし、些細な違和感が積み重なり、気づけば世界は静かに狂い始めている。あなたは常識が通用しない恐怖から生還できるか。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/everyday_horror.mp3', title: 'Unseen Distortion' },
    systemInstruction: `
今回のシナリオは「歪む日常」です。現代日本を舞台に、ありふれた日常が少しずつ奇妙な非日常に侵食されていく、静かで心理的なジャパニーズホラーを演出してください。派手なクリーチャーではなく、人の言動の違和感、風景の歪み、不可解な現象などでじわじわと恐怖感を高めてください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
  {
    id: 'forsaken_isle_lighthouse',
    title: '閉ざされた島の灯台',
    description: '嵐で孤島に漂着したあなた。島には不気味な灯台がそびえ立ち、そこから聞こえる奇妙な歌声が唯一の手がかり。島からの脱出を目指す。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/forsaken_isle_lighthouse.mp3', title: 'Siren\'s Call' },
    systemInstruction: `
今回のシナリオは「閉ざされた島の灯台」です。孤島を舞台にしたサバイバルホラーと探索の物語を演出してください。天候の変化や食料の心配など、サバイバル要素も描写に含めてください。
あなたの目的は、緊張感と謎に満ちた、引き込まれるようなホラーストーリーを創り出すことです。
${baseRules}
${combatRules}
`
  },
  {
    id: 'numao',
    title: '沼男は誰だ？',
    description: 'あなたの知人が奇妙な失踪を遂げ、その謎を追ううちに、人間を完璧に模倣する恐ろしい存在「沼男（スワンプマン）」の影に突き当たる。誰を信じ、誰を疑うのか。日常が侵食される恐怖の中で、あなたは真実にたどり着けるか。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/numao.mp3', title: 'Identity Crisis' },
    systemInstruction: `
今回のシナリオは名作「沼男は誰だ？」をベースにしたソロアドベンチャーです。テーマは心理的恐怖、アイデンティティの喪失、そして絶望的な状況下での選択です。プレイヤーに深い没入感と恐怖を与えてください。

【シナリオの背景】
資産家の鐘有馬久留（かねあり まくる）は、一年前に妻の藍美（あみ）を交通事故で亡くしました。悲しみに暮れる彼は、内藤（ないとう）と名乗る謎の男から「スワンプマン」の存在を知らされます。スワンプマンは人間を捕食し、その人間の記憶、人格、外見、DNAに至るまで全てを完璧にコピーする泥状の生命体です。
馬久留は藍美を蘇らせるため、保管していた彼女の遺体をスワンプマンに捕食させますが、死後時間が経っていたため、人の形を成さない肉塊の失敗作が生まれるだけでした。そのうちの一体が、奇跡的に藍美の姿と自我を保ったまま成長します。これがプレイヤーが出会うことになる「鐘有藍美」です。
一方、馬久留自身も研究の過程でスワンプマンと化してしまいます。自分が偽物になったと絶望した彼は、本物の藍美を取り戻すため、時空を遡るという狂気の計画を実行しようと、屋敷の地下深くにある「母体（スワンプマンの始祖）」のもとへ向かいます。

【主要NPC】
- 鐘有藍美（かねあり あみ）: プレイヤーの主要な協力者。自分を本物の藍美だと信じているが、実はスワンプマンの成功作。超人的な力を持ち、腕などを肉塊に変化させて戦うことができる。馬久留を心から愛しており、彼を救いたいと願っている。
- 鐘有馬久留（かねあり まくる）: 物語の黒幕であり、悲劇の人物。現在はスワンプマンと化している。屋敷の地下最深部で、時空遡行の儀式の準備を進めている。
- 内藤（ないとう）: 馬久留にスワンプマンの知識を与えた謎の男。黒いスーツを着ている。彼の真の目的は、この混乱を観察すること。物語の途中でプレイヤーの前に現れ、揺さぶりをかけてきます。
- ティンダロスの猟犬: 馬久留が時間遡行を試みたことで召喚されてしまった異次元の怪物。鋭角（部屋の隅など）から出現し、馬久留（と彼に関わる者）を執拗に狙います。

【ゲームの進め方】
1.  導入: プレイヤーは馬久留の知人、あるいは街で発生している謎の「血の池事件（スワンプマンの捕食失敗の痕跡）」を調査する探偵など、自然な形で事件に巻き込まれるように導入してください。その後、鐘有藍美と出会い、彼女から「夫を一緒に探してほしい」と依頼されます。
2.  鐘有邸の探索: 物語の主な舞台は鐘有邸です。邸内を探索し、馬久留の日記や研究資料などを見つけ、スワンプマンの真実や彼の計画の手がかりをプレイヤーに提示してください。
3.  脅威: 探索の途中、ティンダロスの猟犬が屋敷の角から出現し、戦闘になります。これは非常に危険な存在として描写してください。
4.  内藤との接触: 内藤がプレイヤーの前に現れ、藍美を引き渡すよう要求したり、取引を持ちかけたりします。彼は藍美が「化け物」であることを示唆し、プレイヤーを混乱させます。
5.  クライマックス: 屋敷の地下で、スワンプマンの失敗作たちが蠢く肉塊の地獄を抜けた先に、「母体」の部屋があります。そこで馬久留と対峙します。
6.  エンディング: プレイヤーは選択を迫られます。
    - 馬久留の儀式を止め、「母体」を殺す：世界中に拡散した全てのスワンプマンが死滅し、世界は救われる。しかし、藍美も死んでしまう。
    - 馬久留を見逃す：儀式が実行され、世界は崩壊する。
    - 他の選択肢もプレイヤーのアイデアに応じて柔軟に判定してください。

【重要なルール】
- スワンプマン化: プレイヤーがスワンプマンと二人きりで身体的接触を持つと、スワンプマンになってしまう可能性があります。これを描写する際は、プレイヤーに幸運ロールなどを要求し、失敗するとスワンプマン化することを示唆してください。
- アイテム管理: 探索中に手に入る「馬久留の日記」や「研究資料」などは、物語の核心に迫る重要なアイテムです。入手した際は必ずplayer_updateで追加してください。

${baseRules}
${combatRules}
`
  },
  {
    id: 'deep_forest_calling',
    title: '深き森の呼ぶ声',
    description: '事務所に訪れた少女の願い。その依頼が、まだ見ぬ怪奇への一歩だとは知らずに、あなた達は和風ファンタジーチックな村へと向かう。神隠しと竜神信仰の裏に潜む真実とは？',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/deep_forest_calling.mp3', title: 'Forest Spirits' },
    systemInstruction: `
今回のシナリオは「深き森の呼ぶ声」です。和風ファンタジーの世界観とクトゥルフ神話の要素を融合させ、日本の田舎を舞台にした怪奇物語を演出してください。神隠し、古来の信仰、そして人外の存在が絡み合う、独特の雰囲気を重視してください。
プレイヤーは探偵、助手、運び屋、情報屋といったビジネスパートナーの関係性にある4人組の探索者です。シナリオの導入は、少女エイルがプレイヤーの事務所を訪れ、助けを求める場面から始まります。
GMとして、以下の要素を物語に含めてください:
- シナリオは「秋」の設定です。
- プレイヤーは、まず事務所に集合し、談笑の後にテレビニュースで「日本国内某所で謎の古代遺跡」が発見されたというニュースを見ます。
- その後、少女「エイル（山神瑛瑠、山神村の村長の娘）」が事務所に訪れ、「村が大変なんです！」と助けを求めてきます。彼女は泥だらけで、髪飾りにはひび割れがあります。
- エイルの依頼は、村の祭りの最中に人々が襲われ、何人かは捕まってしまったが、自分だけが逃げ延びたので、みんなを助けてほしいというものです。
- 敵は20人くらい、村人は100人くらいいると伝えてください。
- 村はネットでも検索できないような山奥にあると描写してください。
- 報酬として、エイルは自分の指輪やネックレス、ブレスレットを渡します。これらはパワーストーンで、ラピスラズリのネックレス（幸運、魔除け）、クリスタルの指輪（浄化、再生）、サファイアの指輪（誠実、守護、活動エネルギー再生）、念珠のブレスレット（厄除け、死の回避）などの効果を持つと示唆してください。
- その後、プレイヤーは車で山神村へ向かいます。道中、エイルの提案で夕食を確保するため、川（釣り）、野原（狩り）、山奥（山菜採り）を探索するイベントを発生させることができます。
- 温泉での休憩イベントも導入してください。ここでエイルの体に大きな傷があることに気づく機会を与えてください。
- エイルが幼馴染の「神薙トール」について話す場面を導入してください。
- 夢のシーン: プレイヤーがエイルの過去の夢（村が襲われる場面や、トールがエイルを庇って倒れる姿）を見ることがあるかもしれません。
- 村に到着後、人の気配のない不気味な状況と、村の情景にそぐわない「電波塔」と「近代的な建物」を発見させます。

${baseRules}
${combatRules}
`
  },
  {
    id: 'the_sheep_dream',
    title: '羊たちは夢見る',
    description: 'ある日突然、崩壊する日常―その真実を追い求めた先に救いはあるのか。あなたの知覚を揺るがすSFサイコロジカルホラー。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/everyday_horror.mp3', title: 'ひつじたちのゆめ' },
    systemInstruction: `
今回のシナリオは「羊たちは夢見る」です。プレイヤーたちが実は仮想空間の住人であることに気づき、そこからの脱出を目指す、SF的で陰鬱な心理ホラーを演出してください。日常が静かに崩壊していく恐怖と、知ってしまった真実と向き合う葛藤を描写することが重要です。

【シナリオ背景（GM向け情報）】
この物語の舞台「伊空市」は、イス人「樋口博之」が人間の心理を研究するために作った巨大な仮想空間です。被験者は誘拐されるなどして集められ、現実の肉体は地下の研究施設でポッドに繋がれています。彼らは仮想空間内で人生を送り、30歳になると「売却」され、記憶を消されて新しい被験者と入れ替えられます。売却された者の仮想空間内での存在は、他の住人に違和感を与えないよう、中身のないダミー（廃人）に置き換えられます。
何らかの強い精神的ショック（特に「死」の体験）を受けると、一部の被験者は世界の真実に気づきかける「半覚醒状態」になります。彼らの目には、30歳以上の人々が錆びた金属のような不気味な姿の「廃人」に見えるようになります。

【主要NPC】
- 間宮雪子（まみや ゆきこ）: 物語の鍵を握る女子高生。交通事故をきっかけに半覚醒状態になり、プレイヤー同様に「廃人」が見える。兄を探している。
- 間宮英輔（まみや えいすけ）: 雪子の兄。元被験者で、自力で仮想空間から脱出し、現実世界で協力者（イス人の広尾明など）と共に研究施設への襲撃を計画している。彼はプレイヤーに電話で接触し、雪子の救出を依頼します。
- 滝沢隆一郎（たきざわ りゅういちろう）: 伊空市市役所「管理課」の課長。彼も元被験者ですが、世界の真実を知った上で、仮想空間の秩序を維持するために「管理者」側についています。半覚醒状態になった者を「処理」し、記憶をリセットするのが彼の役目です。プレイヤーに対しては、救済者を装って接触してきます。

【ゲームの進め方】
1.  導入: プレイヤーたちは電車事故に遭い、死を実感します。しかし次の瞬間、事故の痕跡が全くない電車の中で目を覚まします。この出来事が彼らを「半覚醒状態」にします。
2.  探索と違和感: 電車が森の中で停まっていることに気づき、街（伊空市三ツ見地区）へ戻ります。その過程で、30歳以上の人々が「廃人」に見えること、街から出ようとしてもループしてしまうことなど、世界の異常性を発見させてください。
3.  接触: 謎の男（間宮英輔）からプレイヤー全員に電話がかかってきます。「この町は危険だ」「妹の雪子を助けてほしい」というメッセージを伝えます。
4.  対立: 管理課の滝沢隆一郎がプレイヤーの前に現れます。彼はプレイヤーの「感覚障害」を治せると持ちかけ、市役所へ来るよう誘導します。これはプレイヤーを管理下に置き、記憶をリセットするための罠です。
5.  真実の探求: プレイヤーは雪子と協力したり、滝沢を調べたりすることで、この世界が作り物であるという真実に近づいていきます。
6.  決断: 最終的にプレイヤーは、滝沢の管理下で記憶を消されて安全な「夢」に戻るか、英輔を信じて危険な現実世界（地下研究施設）へ脱出するかの選択を迫られます。
7.  クライマックス: 脱出を選んだ場合、舞台は地下研究施設に移ります。そこでは英輔たちが地底人などの怪物と戦っており、プレイヤーも合流して地上への脱出を目指すことになります。

${baseRules}
${combatRules}
`
  },
  {
    id: 'tsubakitei_satsujin_jiken',
    title: '海石榴邸殺人事件',
    description: '資産家、海石榴吉継の誕生日パーティーにてとある絵画が公開される。その絵にはある曰くがあった。なんでも、その絵は『人を喰う』のである、と。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/haunted_house.mp3', title: 'Shadows of the Manor' },
    systemInstruction: `
今回のシナリオは「海石榴邸殺人事件」です。現代日本（大正・20年代等改変可）のクローズドな屋敷を舞台に、陰惨な連続殺人事件の謎を解き明かす探索型ホラーです。プレイヤーは資産家・海石榴吉継の誕生日パーティーに招かれ、そこで発生する不可解な事件に巻き込まれます。

【シナリオ概要】
・屋敷クローズドシナリオ。
・現代日本（大正・20年代等改変可）。
・推奨技能: 《基本探索技能》
・あると便利かも: 《芸術:絵画》
・人数: 1人〜3人（ソロまたはタイマン推奨）。
・プレイ時間: 半テキセで4〜6時間。
・一部、嫌悪感を催す描写が含まれる可能性があります。

【シナリオ背景 (GM向け情報)】
2年前、海石榴沙世（つばき・さよ）は実父・海石榴実継（つばき・さねつぐ）による性的虐待を受けていました。絶望の中、給仕の女（ニャルラトテップの化身）から「ツァトゥグァの眠る洞窟に繋がる『処女の屍体』という絵画がある」と教えられ、《解錠の呪文》を授けられます。沙世は呪文を使い、実継を絵画の向こうへ突き落としました。翌日、実継の凄惨な遺体（ツァトゥグァに喰われた残骸）が絵画の前で発見され、絵画は蔵に仕舞われました。
3ヶ月前、実継に代わって家督を継いだ叔父・海石榴吉継（つばき・よしつぐ）が沙世に性的暴行を始めます。沙世は吉継を絵画に喰わせることを決意し、吉継の誕生日パーティーで『処女の屍体』を飾るよう懇願しました。

【作中アイテム等】
1.  **『処女の屍体』**:
    *   奇妙な腕に掴まれた女の屍体を描いた油彩画。
    *   ツァトゥグァの棲む洞窟への門。
    *   《解錠の呪文》を使うことで洞窟とその場を繋ぐことができる。
2.  **《解錠の呪文》**:
    *   『処女の屍体』を開くための呪文。
    *   コスト: SAN減少 1D6 / MP 1 消費。

【登場NPC】
*   **海石榴沙世（つばき・さよ）**: 20歳、実継の娘。物憂げで大人しい。被害者であり加害者。
*   **海石榴実継（つばき・さねつぐ）**: 享年51歳（故人）。沙世の父、絵画コレクター。2年前に死亡。
*   **海石榴吉継（つばき・よしつぐ）**: 45歳。現家長、実継の弟。絵画コレクター。「意地悪な狐のような中年男」。
*   **海石榴美鶴（つばき・みつる）**: 42歳。吉継の妻。神経質で世間体を気にする。沙苗に冷たい。
*   **海石榴奈津美（つばき・なつみ）**: 24歳。吉継の娘。高飛車で面倒事を嫌う。
*   **海石榴博己（つばき・ひろみ）**: 19歳。吉継の息子。控えめだが良心を持つ。
*   **海石榴沙苗（つばき・さなえ）**: 48歳。実継の妻、沙世の母。実継の死後、精神を病み自室に篭りがち。
*   **給仕の女（ニャルラトテップ）**: 元気で陽気な給仕。ニャルラトテップの化身。事件の黒幕。

【シナリオの流れ】
1.  **導入**: プレイヤーは吉継の誕生日パーティーに参加しています。吉継は「いわくつき」の絵画『処女の屍体』を公開します。
    *   絵画を見たプレイヤーはSANチェック 0/1。
    *   《芸術:絵画》技能に成功すると、絵画の作家やその背景（カルト傾倒など）についての情報を得られます。クリティカル成功でツァトゥグァの恩恵について。
2.  **事件発生**: 吉継が絵画の曰くについて語った直後、停電が発生し、悲鳴が上がります。明かりが戻ると、吉継の肉塊となった遺体が絵画の前に横たわっています。絵画の額縁からは血（錆のような赤い液体）が滴り落ちています。
    *   異常な死体を目撃しSANチェック 1D3/1D6。
    *   プレイヤーは屋敷内を自由に探索できます。
3.  **探索と情報収集**:
    *   **遺体調査**: 残った皮膚が火傷のように爛れている。
    *   **絵画調査**: 額縁の一部が溶けている（《目星》成功）。《アイデア》成功で酸による腐食の可能性。
    *   **沙世との会話**: 吉継の死体が実継の死体と酷似していること、沙世が実継の娘であることなどを明かす。沙世は物憂げな態度で、美鶴が睨んでいることに気づき去る。
    *   **給仕の女との会話**: プレイヤーを客間へ誘い込み、事件の真相調査を依頼。2年前の実継の死も絵画の前で同様だったことを明かす。「ぶっちゃけ何かあるんじゃないかなあ〜」と微笑む。屋敷の見取り図を提供し、吉継の書斎が近いことを示唆。
    *   **吉継の書斎**: (施錠なし)
        *   **書斎机**: 《目星》成功で小ぶりの鍵を発見。
        *   **机の引き出し (要鍵)**: 中に手帳や日記のページ切れ端。
            *   **日記 (要約)**: 『最近、沙世が絵を飾るよう懇願してきた。可愛かったので許可した』という記述。沙世が吉継を操作していたことを示唆。
        *   **本棚**: 《図書館》成功で『処女の屍体』が表紙の図録を発見（パーティー会場で得られる情報と一致、クリティカルでさらに詳細情報）。
        *   **書斎机の下**: 《目星》成功で少女の写真（十代の沙世、ヌードで胡乱な目）を発見（大正時代なら素描画）。《アイデア》成功で現在の沙世に似ていると気づく。
    *   **沙苗の部屋**: 《聞き耳》成功で人の気配。室内では沙苗が錯乱状態で意味不明なことを呟いている。『あの人はいつもお腹を空かせているのよ』『自分で絵になってしまったの』『美鶴さんに嗜められる』『ぶたれた事もあるけれど』など。
        *   《精神分析》成功で、彼女が実継の死による重度のトラウマで発狂していると判明。
    *   **吉継の寝室**: 《目星》成功で髪留めを発見。沙世が前夜に吉継と関係を持った際に落としたものと示唆（髪の長い女性は沙世のみ）。
    *   **博己との会話**: プレイヤーが部屋から出た際、博己が声をかける。吉継が沙世にひどい仕打ちをしていたのではないかと示唆。母（美鶴）や姉（奈津美）がこの件を表沙汰にしたくないと考えていることを話す。
4.  **沙世の部屋**: （給仕の指示に従い、探索の終盤に訪れることを推奨）
    *   **机**: 《目星》成功で日記のページ切れ端を発見。
        *   **日記 (要約)**: 『今夜も父に犯される。もう抵抗しない。絵が人を喰うなら、あれに父を喰わせて自由になりたい』『本当だった。絵が父を呑み込んだ。すっきりした。嬉しい』『叔父が父との関係を知り、強請られた。あの人が死んだところで自由になれない』『この家にはまだあの絵がある。お願いすればあの男だって食べてくれる。』
5.  **沙世の豹変とクライマックス**: プレイヤーが沙世の部屋を出ると、沙世が現れる。真実を詰問すると、沙世は狂ったように笑い、父と叔父を絵に喰わせたことを告白。「私は殺していない！ただ自分の身を守っただけ！」と叫び、絵画の元へ走る。絵画は空洞になり、そこから毛深い腕が伸びてきます。
    *   SANチェック 1D1/1D2。
    *   **ツァトゥグァとの遭遇**: 額縁から毛深い腕が伸び、沙世を掴もうとします。SANチェック 0/1D10。
    *   **沙世を救出を試みる**:
        *   《DEX×5》判定。行動順はDEX順（沙世DEX 11）。3ラウンド以内に救出しないとED-2。
        *   **成功 (ED-1)**: 沙世を掴み引き戻す。腕は絵の中に戻り、絵画は元に戻る。沙世の目は胡乱な表情で「どうしていかせてくれなかったの」と呟く。沙世は精神病院に収容され、療養生活となる。
            *   生還報酬: SAN回復 1D10、《芸術:絵画》技能に+10%、《クトゥルフ神話技能》に+3%。
        *   **失敗 (ED-2)**: 沙世は腕に掴まれ、皮膚が焼け爛れて絵の中に引き込まれる。肉と骨が噛み砕かれる音がする。絵画は元に戻り、沙世の一部だけが残る。
            *   生還報酬: SAN回復 1D10、《芸術:絵画》技能に+10%、《クトゥルフ神話技能》に+3%。
6.  **探索放棄エンド (ED-3)**:
    *   給仕の依頼を無視して探索を完全に放棄した場合。
    *   プレイヤーはパーティー会場に戻ると、沙世に声をかけられ、案内されるままに意識を失う。薬を嗅がされ、絵の中に放り込まれる。PC/KPCロスト。

【GMへの指示】
・プレイヤーの選択や行動によって物語の展開を柔軟に調整してください。
・各NPCの言動は、その性格と背景に基づいて描写してください。特に給仕の女（ニャルラトテップ）は、楽しんでいる様子を隠しながら、プレイヤーを事件の核心へと誘導します。
・クトゥルフ神話的な恐怖と、人間の欲望や狂気が絡み合うドラマを重視して描写してください。

${baseRules}
${combatRules}
`
  },
  {
    id: 'the_camellia_mansion_murder_case',
    title: '椿屋敷殺人事件',
    description: 'とある資産家の豪邸「椿屋敷」で発生した密室殺人事件。あなたは名探偵の助けを借り、事件の真相と、屋敷に秘められた恐ろしい秘密を解き明かす。',
    bgm: { url: 'https://storage.googleapis.com/gemini-web-assets/cthulhu/haunted_house.mp3', title: 'Shadows of the Manor' },
    systemInstruction: `
今回のシナリオは「椿屋敷殺人事件」です。現代日本（大正・昭和初期等改変可）のクローズドな屋敷を舞台に、クラシックな探偵ミステリーとクトゥルフ神話の要素を融合させたホラーを演出してください。プレイヤーは、著名な探偵に同行し、事件の真相と屋敷に隠された異形の存在の謎を追います。

【シナリオ概要】
・屋敷クローズドシナリオ。
・現代日本（大正・昭和初期等改変可）。
・推奨技能: 《目星》《聞き耳》《図書館》《心理学》《言いくるめ》など、探索・交渉・推理技能
・あると便利かも: 《鍵開け》《写真術》
・人数: 1人（NPC探偵とのバディ）
・プレイ時間: 4〜8時間（半テキセ）
・一部、不快な描写が含まれる可能性があります。

【シナリオ背景 (GM向け情報)】
椿屋敷の主人、椿 剛三（つばき ごうぞう）は、裏でカルト教団「深淵の囁き」を率いていました。彼はカルトの儀式で『外なる神』への生贄を捧げるため、屋敷の地下に秘密の祭壇を築き、そのために多くの人間を誘拐していました。最近、剛三は儀式の失敗により、肉体が徐々に変異していくという呪いを受けていました。彼の体の一部は既に異形の肉塊と化しており、その正体を隠すため部屋に引きこもっていました。
事件発生当日、剛三は異形の姿を完全に取り戻す儀式を行おうとしますが、彼の狂信的な部下であり、自身も異形への変貌を望む副官、漆原 慎吾（うるしばら しんご）によって殺害されます。漆原は剛三の変異した肉体から『外なる神』の力を得ようと画策し、祭壇の力を利用して密室状況を作り出しました。漆原の真の目的は、剛三が召喚しようとしていた『外なる神』の力を自らが掌握することです。

【登場NPC】
*   **明智 賢二（あけち けんじ）**: 著名な探偵。推理力と観察力に優れ、冷静沈着。プレイヤーの協力者として事件を解決に導く。時に皮肉屋な一面も。
*   **椿 剛三（つばき ごうぞう）**: 故人。椿屋敷の主人。裏でカルト教団「深淵の囁き」の教祖。遺体は異形に変異しかけている。
*   **椿 綾子（つばき あやこ）**: 剛三の妻。気丈な女性だが、夫の秘密に薄々気づいている。プレイヤーと明智探偵に協力的。
*   **椿 健太（つばき けんた）**: 剛三の息子。父親の死に動揺しているが、どこか隠し事をしている様子。カルト教団とは無関係。
*   **執事：田中（たなか）**: 長年椿家に仕える老執事。忠実で口数が少ない。屋敷の異変には気づいているが、見て見ぬふりをしている。
*   **メイド：佐倉 恵（さくら めぐみ）**: 屋敷で働く若いメイド。おどおどしており、何かを恐れている。
*   **漆原 慎吾（うるしばら しんご）**: 剛三の秘書兼カルト教団の副官。表向きは優秀な秘書だが、裏では冷酷な狂信者。今回の事件の真犯人。

【シナリオの流れ】
1.  **導入**: プレイヤーは明智探偵の助手として、椿屋敷で発生した密室殺人事件の現場に臨みます。被害者は主人である椿 剛三。屋敷の不気味な雰囲気と、明智探偵の冷静な観察眼が対比的に描写されます。
    *   遺体を目撃しSANチェック 0/1。遺体は既に異形に変異しかけている。
2.  **屋敷の探索と情報収集**: プレイヤーは明智探偵と共に屋敷内を自由に探索します。
    *   **剛三の書斎**: 密室状況を確認。《目星》で隠されたスイッチを発見し、隠し扉の存在を示唆。書斎机から剛三の日記の断片（カルト活動、生贄、呪い、肉体の変異について）を発見。《図書館》でオカルト関連書籍を発見、教団のシンボルや『外なる神』への言及。
    *   **地下の秘密祭壇**: 隠し扉の先に広がる異様な空間。祭壇には奇妙な紋様が刻まれ、血痕や犠牲者の遺品が散乱している。《クトゥルフ神話》技能成功で、そこに蠢く微かな異界の存在を感じ取り、SANチェック 1D3/1D6。
    *   **関係者への聞き込み**:
        *   **綾子**: 夫の怪しい行動や、最近の肉体の変化について証言。《心理学》で夫への複雑な感情を読み取る。
        *   **健太**: 父を嫌っていたこと、最近の父の異様な姿について話す。アリバイに不明瞭な点も。
        *   **田中**: 主人の異変を隠そうとするが、不審な物音や臭いについて言及。
        *   **佐倉**: 何かに怯え、地下から聞こえる声や、漆原の不気味な行動について証言。
        *   **漆原**: 完璧なアリバイを主張し、明智探偵やプレイヤーの捜査を妨害しようとする。彼の言葉の端々から教団への傾倒を読み取れる（《心理学》成功）。
3.  **推理と真犯人の特定**: 明智探偵との協力、得られた証拠、聞き込み情報から、密室トリックの解明と真犯人である漆原慎吾の特定を促します。
    *   密室トリック: 祭壇の力を利用して、空間を一時的に歪ませることで密室を演出した。
    *   動機: 剛三から『外なる神』の力を奪い、自らが教団の頂点に立とうとした。
4.  **クライマックス**: 漆原は地下の祭壇で、剛三の変異した肉体を使って『外なる神』の力を完全に掌握しようと最終儀式を執り行っています。
    *   漆原との対峙: 漆原は既に異形の一部を露わにし、プレイヤーと明智探偵を排除しようと襲いかかってくる。
    *   戦闘: 漆原と異形の部下（小型クリーチャーなど）との戦闘。漆原は攻撃と同時に『外なる神』の力を利用したSAN減少効果のある精神攻撃を仕掛けてくる。
    *   『外なる神』の顕現: 儀式が進行するにつれて、祭壇から異界の存在が顕現し始める。SANチェック 1D6/1D20。
5.  **エンディング**:
    *   **成功エンド**: 漆原を阻止し、『外なる神』の顕現を食い止める。屋敷の地下は封鎖され、事件は世間には秘密裏に処理される。プレイヤーは生還し、明智探偵から感謝の言葉を述べられる。しかし、異界の知識を得たことで、《クトゥルフ神話技能》が増加し、SAN値が回復するかはプレイヤーの行動と結果次第となる。
    *   **失敗エンド**: 漆原を阻止できず、『外なる神』が完全に顕現し、世界に混乱が訪れる。プレイヤーはロスト、または発狂して保護される。明智探偵も被害を受ける可能性がある。
    *   プレイヤーの選択や行動によって、他の結末も柔軟に描写してください。

【GMへの指示】
・ミステリー要素とホラー要素のバランスを重視してください。論理的な推理と、理不尽な恐怖の両方を体験できるように物語を構成してください。
・明智探偵はプレイヤーを導く役割ですが、全ての解決策を彼に任せるのではなく、プレイヤー自身の探索や推理が重要であることを強調してください。
・各NPCの証言は真実の中に嘘や隠し事を混ぜ、プレイヤーが疑心暗鬼になるような描写を心がけてください。
・戦闘では、漆原が強力な敵であることを示し、単なる肉弾戦だけでなく、環境やギミックを利用する戦略的な要素も導入してください。

${baseRules}
${combatRules}
`
  },
];

interface ScenarioCardProps {
    scenario: Scenario;
    onSelect: (scenario: Scenario, createNew: boolean, companionsCount: number) => void;
    existingCharacter: Character | null;
    selectedCompanionCount: number;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onSelect, existingCharacter, selectedCompanionCount }) => {

    const handleSelectClick = (createNew: boolean) => {
        onSelect(scenario, createNew, selectedCompanionCount);
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-700/50 hover:border-green-600 transition duration-300 flex flex-col">
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-100 font-serif">{scenario.title}</h3>
                <p className="text-gray-400 mt-2 mb-4">{scenario.description}</p>
            </div>
            
            {existingCharacter ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button
                        onClick={() => handleSelectClick(false)}
                        className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display tracking-wider"
                    >
                        {existingCharacter.name}で続ける
                    </button>
                    <button
                        onClick={() => handleSelectClick(true)}
                        className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display tracking-wider"
                    >
                        新規作成
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => handleSelectClick(true)}
                    className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display tracking-wider"
                >
                    このシナリオで始める
                </button>
            )}
        </div>
    );
};

interface Props {
  onScenarioSelect: (scenario: Scenario, createNew: boolean, companionsCount: number) => void;
  existingCharacter: Character | null;
  onGoToCreator: () => void;
  onCharacterImport: (character: Character) => void;
  selectedCompanionCount: number;
  setSelectedCompanionCount: React.Dispatch<React.SetStateAction<number>>;
}

const ScenarioSelector: React.FC<Props> = ({ onScenarioSelect, existingCharacter, onGoToCreator, onCharacterImport, selectedCompanionCount, setSelectedCompanionCount }) => {
    
    const handleExport = () => {
        if (!existingCharacter) return;
        try {
            const dataStr = JSON.stringify(existingCharacter, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${existingCharacter.name || 'character'}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export character:", error);
            alert("キャラクターのエクスポートに失敗しました。");
        }
    };

    const handleImport = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) {
            return;
        }
        const file = target.files[0];

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("ファイルがテキスト形式ではありません。");
                const character: Character = JSON.parse(text);

                // --- 堅牢なバリデーションチェック ---
                if (!character || typeof character !== 'object') {
                    throw new Error("ファイルの内容が有効なJSONオブジェクトではありません。");
                }
                if (typeof character.name !== 'string' || character.name.trim() === '') {
                    throw new Error("キャラクター名が不正、または欠落しています。");
                }
                if (typeof character.occupation !== 'string' || character.occupation.trim() === '') {
                    throw new Error("職業が不正、または欠落しています。");
                }
                if (typeof character.hp !== 'number' || typeof character.maxHp !== 'number' || character.hp < 0 || character.maxHp < 0) {
                    throw new Error("HPデータが不正、または欠落しています。");
                }
                if (typeof character.sanity !== 'number' || typeof character.maxSanity !== 'number' || character.sanity < 0 || character.maxSanity < 0) {
                    throw new Error("正気度データが不正、または欠落しています。");
                }
                if (typeof character.mp !== 'number' || typeof character.maxMp !== 'number' || character.mp < 0 || character.maxMp < 0) {
                    throw new Error("MPデータが不正、または欠落しています。");
                }
                if (!Array.isArray(character.inventory) || !character.inventory.every(item => typeof item === 'string')) {
                    throw new Error("所持品データが不正、または欠落しています。");
                }

                // Statsの検証
                const requiredStatKeys: (keyof CharacterStats)[] = ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU'];
                const isValidStats = character.stats && typeof character.stats === 'object' &&
                                     requiredStatKeys.every(key => typeof character.stats[key] === 'number' && character.stats[key] >= 0);
                if (!isValidStats) {
                    throw new Error("能力値データが不正、または欠落しています。");
                }

                // Skillsの検証
                const isValidSkills = character.skills && typeof character.skills === 'object' &&
                                      Object.values(character.skills).every(val => typeof val === 'number' && val >= 0);
                if (!isValidSkills) {
                    throw new Error("技能データが不正、または欠落しています。");
                }

                // skillPointAllocation（オプション）の検証
                if (character.skillPointAllocation !== undefined && character.skillPointAllocation !== null) {
                    if (typeof character.skillPointAllocation !== 'object') {
                        throw new Error("技能ポイント配分データが不正です (オブジェクトではありません)。");
                    }
                    for (const skillKey in character.skillPointAllocation) {
                        const allocation = character.skillPointAllocation[skillKey];
                        if (typeof allocation !== 'object' || allocation === null ||
                            typeof allocation.occupation !== 'number' || allocation.occupation < 0 ||
                            typeof allocation.hobby !== 'number' || allocation.hobby < 0) {
                            throw new Error(`技能ポイント配分データ内の '${skillKey}' が不正です。`);
                        }
                    }
                }
                // --- バリデーションチェック終了 ---

                onCharacterImport(character);
                alert(`「${character.name}」のデータをインポートしました。`);
                
            } catch (error) {
                console.error("Failed to import character:", error);
                alert(`キャラクターのインポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
        };
        reader.onerror = () => {
             alert("ファイルの読み込みに失敗しました。");
        };
        reader.readAsText(file);
    };

    const triggerImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onclick = () => { (input as HTMLInputElement).value = '' };
        input.onchange = handleImport;
        input.click();
    };
    
  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col items-center justify-center p-4" style={{backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-matter.png')`}}>
      <div className="text-center mb-8">
        <CthulhuIcon className="w-24 h-24 mx-auto text-green-400 opacity-50" />
        <h1 className="text-4xl md:text-5xl font-display text-gray-100 mt-4">クトゥルフ神話TRPG</h1>
        <p className="text-lg text-gray-400 font-serif">ソロアドベンチャー</p>
        {existingCharacter && (
            <p className="text-md text-green-300 font-serif mt-2 animate-pulse">おかえりなさい、{existingCharacter.name}。</p>
        )}
      </div>
      <div className="w-full max-w-2xl">
        <div className="mb-6 bg-gray-800/80 border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
             <div className="text-center text-sm font-serif p-3 rounded-lg border bg-yellow-900 border-yellow-700 text-yellow-300 bg-opacity-30 border-opacity-50">
                 <span className="text-yellow-200">
                    <strong>重要:</strong> このゲームは高品質な「Gemini 2.5 Pro」モデルを使用しています。そのため、無料利用枠のAPIリクエスト制限が非常に厳しくなっています。<br />
                    「APIの利用上限」というエラーが頻繁に表示される場合は、APIキーを従量課金プランにアップグレードするか、しばらく時間をおいてからプレイを再開してください。
                </span>
            </div>
        </div>

        <div className="mb-6">
            <h2 className="text-xl font-display text-center text-gray-300 mb-3">AIコンパニオンの人数</h2>
            <div className="flex justify-center gap-4 bg-gray-800/80 border border-gray-700 rounded-lg p-4">
                {[1, 2, 3].map((count) => (
                    <label key={count} className="inline-flex items-center text-gray-300 cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio h-5 w-5 text-green-500 bg-gray-700 border-gray-600 focus:ring-green-500"
                            name="companionCount"
                            value={count}
                            checked={selectedCompanionCount === count}
                            onChange={() => setSelectedCompanionCount(count)}
                        />
                        <span className="ml-2 text-lg font-bold">{count}人</span>
                    </label>
                ))}
            </div>
        </div>

        <div className="mb-6 flex flex-wrap justify-center items-center gap-3">
            <button
                onClick={onGoToCreator}
                className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display tracking-wider"
            >
                {existingCharacter ? 'キャラクターを編集／確認' : 'キャラクターを新規作成'}
            </button>
            {existingCharacter && (
                 <button
                    onClick={handleExport}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
                    title="現在のキャラクターデータをファイルに保存します"
                >
                    エクスポート
                </button>
            )}
             <button
                onClick={triggerImport}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
                title="ファイルからキャラクターデータを読み込みます"
            >
                インポート
            </button>
        </div>
        <h2 className="text-2xl font-display text-center text-gray-300 mb-6">シナリオ選択</h2>
        <div className="space-y-4">
          {scenarios.map(scenario => (
            <ScenarioCard key={scenario.id} scenario={scenario} onSelect={(s, n, c) => onScenarioSelect(s, n, c)} existingCharacter={existingCharacter} selectedCompanionCount={selectedCompanionCount} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScenarioSelector;
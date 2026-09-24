/** Editorial acquisition requests, NOT published/approved image records. */
const rows = `
leonardo-supper|masterworks|The Last Supper|Leonardo da Vinci|Jhn 13:21|Leonardo da Vinci Last Supper|Last Supper by Leonardo da Vinci.jpg
michelangelo-adam|masterworks|The Creation of Adam|Michelangelo|Gen 2:7|Michelangelo Creation Adam|Michelangelo, The Creation of Adam.jpg
caravaggio-matthew|masterworks|The Calling of Saint Matthew|Caravaggio|Mat 9:9|Caravaggio Calling Saint Matthew
van-eyck-ghent|masterworks|Ghent Altarpiece: open polyptych|Hubert and Jan van Eyck|Rev 5|Ghent Altarpiece open
van-eyck-lamb|masterworks|Ghent Altarpiece: Adoration of the Lamb|Hubert and Jan van Eyck|Rev 7:9|Ghent altarpiece middle panel|Ghent altarpiece, middle panel, by Hubert van Eyck.jpg
leonardo-rocks|masterworks|Virgin of the Rocks (Louvre)|Leonardo da Vinci|Luk 1|Leonardo Virgin Rocks Louvre
leonardo-annunciation|masterworks|Annunciation (Uffizi)|Leonardo da Vinci|Luk 1:26|Leonardo Annunciation Uffizi
leonardo-magi|masterworks|Adoration of the Magi (Uffizi)|Leonardo da Vinci|Mat 2:11|Leonardo Adoration Magi Uffizi
leonardo-john|masterworks|Saint John the Baptist|Leonardo da Vinci|Jhn 1:29|Leonardo Saint John Baptist Louvre
michelangelo-eve|masterworks|Creation of Eve|Michelangelo|Gen 2:21|Michelangelo Creation Eve Sistine
michelangelo-fall|masterworks|The Fall and Expulsion from Paradise|Michelangelo|Gen 3|Michelangelo Fall Expulsion Paradise Sistine
michelangelo-flood|masterworks|The Deluge|Michelangelo|Gen 7|Michelangelo Deluge Sistine
michelangelo-noah|masterworks|The Sacrifice of Noah|Michelangelo|Gen 8:20|Michelangelo Sacrifice Noah Sistine
michelangelo-light|masterworks|Separation of Light from Darkness|Michelangelo|Gen 1:3|Michelangelo Separation Light Darkness
michelangelo-judgement|masterworks|The Last Judgment|Michelangelo|Mat 25:31|Michelangelo Last Judgment Sistine
raphael-transfiguration|masterworks|The Transfiguration|Raphael|Mat 17:1|Raphael Transfiguration Vatican
raphael-sistine-madonna|masterworks|Sistine Madonna|Raphael|Luk 2|Raphael Sistine Madonna Dresden
raphael-meadow|masterworks|Madonna of the Meadow|Raphael|Luk 1|Raphael Madonna Meadow Vienna
raphael-ezekiel|masterworks|The Vision of Ezekiel|Raphael|Ezk 1|Raphael Vision Ezekiel
raphael-fishing|masterworks|The Miraculous Draught of Fishes|Raphael|Luk 5:1|Raphael Miraculous Draught Fishes cartoon
caravaggio-conversion|masterworks|Conversion on the Way to Damascus|Caravaggio|Act 9:3|Caravaggio Conversion Damascus Cerasi
caravaggio-entombment|masterworks|The Entombment of Christ|Caravaggio|Jhn 19:38|Caravaggio Entombment Vatican
caravaggio-emmaus|masterworks|Supper at Emmaus (London)|Caravaggio|Luk 24:30|Caravaggio Supper Emmaus National Gallery
caravaggio-thomas|masterworks|The Incredulity of Saint Thomas|Caravaggio|Jhn 20:24|Caravaggio Incredulity Thomas
caravaggio-taking|masterworks|The Taking of Christ|Caravaggio|Mrk 14:43|Caravaggio Taking Christ Dublin
caravaggio-isaac|masterworks|Sacrifice of Isaac (Uffizi)|Caravaggio|Gen 22:9|Caravaggio Sacrifice Isaac Uffizi
caravaggio-rest|masterworks|Rest on the Flight into Egypt|Caravaggio|Mat 2:13|Caravaggio Rest Flight Egypt
rembrandt-prodigal|masterworks|The Return of the Prodigal Son|Rembrandt|Luk 15:20|Rembrandt Return Prodigal Son
rembrandt-storm|masterworks|Christ in the Storm on the Sea of Galilee|Rembrandt|Mrk 4:35|Rembrandt Storm Sea Galilee
rembrandt-belshazzar|masterworks|Belshazzar's Feast|Rembrandt|Dan 5|Rembrandt Belshazzar Feast
rembrandt-isaac|masterworks|The Sacrifice of Isaac|Rembrandt|Gen 22:9|Rembrandt Sacrifice Isaac Hermitage
rembrandt-jacob|masterworks|Jacob Blessing the Sons of Joseph|Rembrandt|Gen 48|Rembrandt Jacob Blessing Sons Joseph
rembrandt-family|masterworks|The Holy Family (Hermitage)|Rembrandt|Luk 2|Rembrandt Holy Family Hermitage
rembrandt-lazarus|masterworks|The Raising of Lazarus|Rembrandt|Jhn 11:38|Rembrandt Raising Lazarus painting
rembrandt-cross|masterworks|The Descent from the Cross|Rembrandt|Jhn 19:38|Rembrandt Descent Cross 1634
rembrandt-emmaus|masterworks|Supper at Emmaus (Louvre)|Rembrandt|Luk 24:30|Rembrandt Supper Emmaus Louvre
vermeer-martha|masterworks|Christ in the House of Martha and Mary|Johannes Vermeer|Luk 10:38|Vermeer Christ Martha Mary
veronese-cana|masterworks|The Wedding at Cana|Paolo Veronese|Jhn 2|Veronese Wedding Cana Louvre
veronese-emmaus|masterworks|Supper at Emmaus (Louvre)|Paolo Veronese|Luk 24:30|Veronese Supper Emmaus Louvre
veronese-levi|masterworks|The Feast in the House of Levi|Paolo Veronese|Luk 5:29|Veronese Feast House Levi
titian-noli|masterworks|Noli me tangere|Titian|Jhn 20:14|Titian Noli me tangere National Gallery
titian-annunciation|masterworks|The Annunciation (San Salvador)|Titian|Luk 1:26|Titian Annunciation San Salvador
titian-isaac|masterworks|The Sacrifice of Isaac|Titian|Gen 22:9|Titian Sacrifice Isaac Salute
tintoretto-supper|masterworks|The Last Supper (San Giorgio Maggiore)|Tintoretto|Jhn 13|Tintoretto Last Supper San Giorgio Maggiore
_tintoretto-cross|masterworks|Crucifixion (Scuola Grande di San Rocco)|Tintoretto|Jhn 19:17|Tintoretto Crucifixion San Rocco
rubens-raising|masterworks|The Elevation of the Cross|Peter Paul Rubens|Jhn 19:17|Rubens Elevation Cross Antwerp
rubens-descent|masterworks|The Descent from the Cross|Peter Paul Rubens|Jhn 19:38|Rubens Descent Cross Antwerp
rubens-innocents|masterworks|Massacre of the Innocents|Peter Paul Rubens|Mat 2:16|Rubens Massacre Innocents Ontario
rubens-samson|masterworks|Samson and Delilah|Peter Paul Rubens|Jdg 16|Rubens Samson Delilah National Gallery
van-dyck-betrayal|masterworks|The Taking of Christ|Anthony van Dyck|Mrk 14:43|Van Dyck Taking Christ Prado
poussin-manna|masterworks|The Israelites Gathering the Manna|Nicolas Poussin|Exo 16|Poussin Israelites Gathering Manna
poussin-solomon|masterworks|The Judgment of Solomon|Nicolas Poussin|1Ki 3:16|Poussin Judgment Solomon Louvre
poussin-moses|masterworks|The Finding of Moses (London)|Nicolas Poussin|Exo 2:5|Poussin Finding Moses National Gallery
claude-sheba|masterworks|Embarkation of the Queen of Sheba|Claude Lorrain|1Ki 10|Claude Embarkation Queen Sheba
velazquez-crucified|masterworks|Christ Crucified|Diego Velázquez|Jhn 19:17|Velazquez Christ Crucified Prado
zurbaran-lamb|masterworks|Agnus Dei|Francisco de Zurbarán|Jhn 1:29|Zurbaran Agnus Dei Prado
murillo-prodigal|masterworks|The Return of the Prodigal Son|Bartolomé Esteban Murillo|Luk 15:20|Murillo Return Prodigal Son Washington
murillo-shepherds|masterworks|Adoration of the Shepherds|Bartolomé Esteban Murillo|Luk 2:8|Murillo Adoration Shepherds Prado
rogier-descent|masterworks|The Descent from the Cross|Rogier van der Weyden|Jhn 19:38|Rogier Descent Cross Prado
rogier-judgement|masterworks|The Last Judgment (Beaune)|Rogier van der Weyden|Mat 25:31|Rogier Last Judgment Beaune
bosch-magi|masterworks|The Adoration of the Magi|Hieronymus Bosch|Mat 2:11|Bosch Adoration Magi Prado
bruegel-babel|masterworks|The Tower of Babel (Vienna)|Pieter Bruegel the Elder|Gen 11|Bruegel Tower Babel Vienna
bruegel-paul|masterworks|The Conversion of Paul|Pieter Bruegel the Elder|Act 9|Bruegel Conversion Paul
_durer-magi|masterworks|Adoration of the Magi (Uffizi)|Albrecht Dürer|Mat 2:11|Durer Adoration Magi Uffizi
cranach-adam|masterworks|Adam and Eve (Uffizi)|Lucas Cranach the Elder|Gen 3|Cranach Adam Eve Uffizi
angelico-san-marco|masterworks|Annunciation (San Marco)|Fra Angelico|Luk 1:26|Fra Angelico Annunciation San Marco
angelico-prado|masterworks|Annunciation (Prado)|Fra Angelico|Luk 1:26|Fra Angelico Annunciation Prado
angelico-noli|masterworks|Noli me tangere|Fra Angelico|Jhn 20:14|Fra Angelico Noli me tangere
masaccio-tribute|masterworks|The Tribute Money|Masaccio|Mat 17:24|Masaccio Tribute Money
masaccio-expulsion|masterworks|Expulsion from the Garden of Eden|Masaccio|Gen 3:23|Masaccio Expulsion Eden
masolino-temptation|masterworks|Temptation of Adam and Eve|Masolino da Panicale|Gen 3|Masolino Temptation Adam Eve
_giotto-lamentation|masterworks|Lamentation (Scrovegni Chapel)|Giotto|Jhn 19:38|Giotto Lamentation Scrovegni
_giotto-kiss|masterworks|The Kiss of Judas|Giotto|Mrk 14:43|Giotto Kiss Judas Scrovegni
_giotto-resurrection|masterworks|Resurrection and Noli me tangere|Giotto|Jhn 20:14|Giotto Resurrection Noli me tangere Scrovegni
_duccio-entry|masterworks|Entry into Jerusalem (Maestà)|Duccio|Mat 21:1|Duccio Entry Jerusalem Maesta
botticelli-mystic|masterworks|The Mystical Nativity|Sandro Botticelli|Luk 2|Botticelli Mystical Nativity
botticelli-cestello|masterworks|Cestello Annunciation|Sandro Botticelli|Luk 1:26|Botticelli Cestello Annunciation
botticelli-magi|masterworks|Adoration of the Magi (Uffizi)|Sandro Botticelli|Mat 2:11|Botticelli Adoration Magi Uffizi 1475
mantegna-lamentation|masterworks|Lamentation over the Dead Christ|Andrea Mantegna|Jhn 19:38|Mantegna Lamentation Dead Christ Brera
bellini-agony|masterworks|The Agony in the Garden|Giovanni Bellini|Luk 22:39|Bellini Agony Garden National Gallery
perugino-keys|masterworks|Delivery of the Keys|Pietro Perugino|Mat 16:19|Perugino Delivery Keys Sistine
_ghirlandaio-shepherds|masterworks|Adoration of the Shepherds|Domenico Ghirlandaio|Luk 2:8|Ghirlandaio Adoration Shepherds Sassetti
_grunewald-crucifixion|masterworks|Crucifixion (Isenheim Altarpiece)|Matthias Grünewald|Jhn 19:17|Grunewald Isenheim Crucifixion
honthorst-shepherds|masterworks|Adoration of the Shepherds|Gerrit van Honthorst|Luk 2:8|Honthorst Adoration Shepherds
latour-magdalene|masterworks|The Magdalen with the Smoking Flame|Georges de La Tour|Luk 8:2|Georges La Tour Magdalen Smoking Flame
latour-joseph|masterworks|Saint Joseph the Carpenter|Georges de La Tour|Mat 13:55|Georges La Tour Joseph Carpenter Louvre
champaigne-supper|masterworks|The Last Supper|Philippe de Champaigne|Jhn 13|Philippe Champaigne Last Supper Louvre
_delacroix-sea|masterworks|Christ on the Sea of Galilee|Eugène Delacroix|Mrk 4:35|Delacroix Christ Sea Galilee
moreau-apparition|masterworks|The Apparition|Gustave Moreau|Mrk 6:17|Gustave Moreau Apparition
martin-wrath|masterworks|The Great Day of His Wrath|John Martin|Rev 6:12|John Martin Great Day Wrath
martin-heaven|masterworks|The Plains of Heaven|John Martin|Rev 21|John Martin Plains Heaven
martin-deluge|masterworks|The Eve of the Deluge|John Martin|Gen 6|John Martin Eve Deluge
blake-ladder|masterworks|Jacob's Ladder|William Blake|Gen 28:10|William Blake Jacob Ladder
blake-days|masterworks|The Ancient of Days|William Blake|Dan 7:9|William Blake Ancient Days
hunt-light|masterworks|The Light of the World|William Holman Hunt|Rev 3:20|William Holman Hunt Light World
hunt-scapegoat|masterworks|The Scapegoat|William Holman Hunt|Lev 16|William Holman Hunt Scapegoat
millais-parents|masterworks|Christ in the House of His Parents|John Everett Millais|Luk 2:51|Millais Christ House Parents
tanner-annunciation|masterworks|The Annunciation|Henry Ossawa Tanner|Luk 1:26|Henry Ossawa Tanner Annunciation
tanner-lazarus|masterworks|The Raising of Lazarus|Henry Ossawa Tanner|Jhn 11:38|Henry Ossawa Tanner Raising Lazarus
honthorst-high-priest|masterworks|Christ before the High Priest|Gerrit van Honthorst|Mat 26:57|Honthorst Christ High Priest
bloch-sermon|masterworks|Sermon on the Mount|Carl Bloch|Mat 5|Carl Bloch Sermon Mount
hofmann-gethsemane|masterworks|Christ in Gethsemane|Heinrich Hofmann|Luk 22:39|Heinrich Hofmann Christ Gethsemane
hofmann-temple|masterworks|Christ in the Temple|Heinrich Hofmann|Luk 2:41|Heinrich Hofmann Christ Temple
mesha-stele|artifacts|Mesha Stele||2Ki 3|Mesha stele Louvre
_tel-dan|artifacts|Tel Dan Stele||2Ki 8|Tel Dan stele
_merneptah|artifacts|Merneptah Stele||Exo 1|Merneptah stele
pilate-stone|artifacts|Pilate inscription||Mat 27|Pilate stone Caesarea inscription
siloam-inscription|artifacts|Siloam inscription||2Ki 20:20|Siloam inscription Istanbul
sennacherib-prism|artifacts|Sennacherib's prism||2Ki 18|Sennacherib Taylor prism
lachish-reliefs|artifacts|Lachish siege relief||2Ki 18:14|Lachish relief British Museum
cyrus-cylinder|artifacts|Cyrus Cylinder||Ezr 1|Cyrus cylinder
black-obelisk|artifacts|Black Obelisk of Shalmaneser III||2Ki 9|Black Obelisk Shalmaneser
ketef-hinnom|artifacts|Ketef Hinnom silver amulets||Num 6:24|Ketef Hinnom amulets
lachish-letter|artifacts|Lachish ostracon||Jer 34|Lachish ostracon letter
arad-ostracon|artifacts|Arad ostracon||Jer 32|Arad ostracon
hezekiah-seal|artifacts|Hezekiah bulla||2Ki 20|Hezekiah bulla
warning-inscription|artifacts|Temple warning inscription||Act 21|Temple warning inscription Jerusalem
magdala-stone|artifacts|Magdala Stone||Mrk 1:21|Magdala stone
_galilee-boat|artifacts|Ancient Galilee boat||Luk 5|Sea Galilee boat ancient
caiaphas-ossuary|artifacts|Ossuary attributed to Caiaphas||Mat 26:57|Caiaphas ossuary
yehohanan|artifacts|Crucifixion heel bone from Givat ha-Mivtar||Jhn 19:17|Yehohanan heel bone crucifixion
_gallio|artifacts|Gallio inscription||Act 18:12|Gallio inscription Delphi
_erastus|artifacts|Erastus pavement inscription||Rom 16:23|Erastus inscription Corinth
nazareth-inscription|artifacts|Nazareth inscription (provenance debated)||Mat 28|Nazareth inscription
augustus-coin|artifacts|Coin depicting Augustus||Luk 2:1|Augustus denarius coin museum
_tiberius-coin|artifacts|Denarius depicting Tiberius||Mat 22:19|Tiberius denarius tribute penny
_tyrian-shekel|artifacts|Tyrian silver shekel||Mat 17:24|Tyrian shekel coin
widows-mite|artifacts|Hasmonean bronze prutah||Mrk 12:42|Alexander Jannaeus prutah
herod-coin|artifacts|Coin of Herod the Great||Mat 2|Herod Great coin
pilate-coin|artifacts|Prutah of Pontius Pilate||Luk 3:1|Pontius Pilate prutah
felix-coin|artifacts|Coin issued under Antonius Felix||Act 24|Antonius Felix coin
festus-coin|artifacts|Coin issued under Porcius Festus||Act 25|Porcius Festus coin
agrippa-coin|artifacts|Coin of Herod Agrippa I||Act 12|Herod Agrippa I coin
revolt-shekel|artifacts|First Jewish Revolt silver shekel||Luk 21|First Jewish Revolt shekel
ishtar-lion|artifacts|Glazed brick lion from Babylon||Dan 1|Ishtar Gate lion glazed brick
susa-frieze|artifacts|Glazed brick archers from Susa||Est 1|Susa archers frieze Louvre
lamassu|artifacts|Assyrian winged human-headed bull||Isa 37|Lamassu Louvre
sargon-relief|artifacts|Relief of Sargon II||Isa 20:1|Sargon II relief Louvre
behistun|artifacts|Behistun inscription||Ezr 6|Behistun inscription relief
hammurabi|artifacts|Stele of Hammurabi||Exo 21|Hammurabi code stele Louvre
_ebla|artifacts|Ebla clay tablet||Gen 11|Ebla clay tablet
baal-stele|artifacts|Baal with Thunderbolt stele||1Ki 18|Baal thunderbolt stele Louvre
ugaritic-alphabet|artifacts|Ugaritic alphabet tablet||Deu 6|Ugaritic alphabet tablet
flood-tablet|artifacts|Mesopotamian Flood Tablet||Gen 6|Gilgamesh flood tablet British Museum
roman-lamp|artifacts|Roman terracotta oil lamp||Mat 25:1|Roman terracotta oil lamp museum
herodian-lamp|artifacts|Herodian oil lamp||Mat 5:15|Herodian oil lamp
bronze-lamp|artifacts|Roman bronze lamp||Luk 15:8|Roman bronze oil lamp museum
amphora|artifacts|Roman transport amphora||Act 27|Roman amphora museum
unguentarium|artifacts|Roman glass unguentarium||Mrk 14|Roman glass unguentarium museum
alabaster-jar|artifacts|Alabaster perfume vessel||Luk 7:37|Alabaster perfume jar museum
bronze-mirror|artifacts|Ancient bronze mirror||1Co 13:12|Roman bronze mirror museum
linen-textile|artifacts|Ancient Egyptian linen textile||Exo 28|Egyptian linen textile museum
judean-weight|artifacts|Judean stone weight||Lev 19:35|Judean stone weight shekel
slingstones|artifacts|Ancient sling stones||1Sa 17|Lachish sling stones
arrowheads|artifacts|Arrowheads from Lachish||2Ki 18|Lachish arrowheads
canaan-sword|artifacts|Bronze Age Levantine sword||1Sa 17|Canaan bronze sword museum
roman-gladius|artifacts|Roman gladius||Eph 6:17|Roman gladius museum
roman-shield|artifacts|Roman shield from Dura-Europos||Eph 6:16|Dura Europos scutum shield
roman-helmet|artifacts|Roman military helmet||Eph 6:17|Roman helmet museum
roman-sandals|artifacts|Roman leather sandals||Eph 6:15|Roman sandals museum
writing-tablet|artifacts|Roman wax writing tablet||Luk 1:63|Roman wax writing tablet museum
reed-pen|artifacts|Ancient writing reed and palette||3Jn 1:13|Egyptian reed pen palette
balance-scales|artifacts|Roman balance scales||Pro 11:1|Roman balance scales museum
lmlk-jar|artifacts|LMLK-stamped storage-jar handle||2Ki 18|LMLK jar handle
beersheba-altar|artifacts|Four-horned altar from Beersheba||Amo 3:14|Beersheba horned altar
arad-altar|artifacts|Incense altar from Tel Arad||2Ki 23|Arad incense altar
arch-titus-menorah|artifacts|Menorah relief on the Arch of Titus||Luk 21|Arch Titus menorah relief
nimrud-ivory|artifacts|Nimrud carved ivory||Amo 6:4|Nimrud ivory British Museum
phoenician-ivory|artifacts|Phoenician carved ivory||1Ki 22:39|Phoenician ivory museum
persian-seal|artifacts|Achaemenid seal||Est 8:8|Achaemenid seal museum
babylon-seal|artifacts|Babylonian cylinder seal||Dan 6:17|Babylonian cylinder seal museum
egyptian-brick|artifacts|Ancient Egyptian mud brick||Exo 5|Ancient Egypt mud brick museum
fishing-weight|artifacts|Ancient fishing-net weights||Mat 4:18|Ancient fishing net weights museum
millstone|artifacts|Ancient rotary millstone||Mat 18:6|Roman millstone museum
jerusalem-ossuary|artifacts|First-century Jerusalem ossuary||Jhn 19:41|Jerusalem ossuary museum
sarcophagus-jonah|artifacts|Early Christian Jonah sarcophagus||Jon 2|Jonah sarcophagus Vatican
samaritan-inscription|artifacts|Samaritan inscription||Jhn 4|Samaritan inscription museum
silver-trumpets|artifacts|Ancient trumpet||Num 10|Tutankhamun trumpet
sinai-icon|heritage|Christ Pantocrator (Sinai)|Anonymous Byzantine artist|Col 1:15|Christ Icon Sinai|Christ Icon Sinai 6th century.jpg
michelangelo-pieta|heritage|Pietà (St. Peter's Basilica)|Michelangelo|Jhn 19:38|Pieta Michelangelo Vatican|Pieta by Michelangelo.jpg
sistine-ceiling|heritage|Sistine Chapel ceiling: overview|Michelangelo|Gen 1|Sistine Chapel ceiling|Sistine Chapel ceiling 02.jpg
kells-chi-rho|heritage|Book of Kells: Chi Rho page||Mat 1:18|Book Kells Chi Rho
lindisfarne-matthew|heritage|Lindisfarne Gospels: Matthew opening||Mat 1|Lindisfarne Gospels Matthew incipit
sinaiticus|heritage|Codex Sinaiticus manuscript page||Jhn 1|Codex Sinaiticus manuscript page
vaticanus|heritage|Codex Vaticanus manuscript page||Jhn 1|Codex Vaticanus manuscript
alexandrinus|heritage|Codex Alexandrinus manuscript page||Jhn 1|Codex Alexandrinus manuscript
leningrad-codex|heritage|Leningrad Codex manuscript page||Gen 1|Leningrad Codex manuscript
aleppo-codex|heritage|Aleppo Codex manuscript page||Deu 6|Aleppo Codex page
great-isaiah|heritage|Great Isaiah Scroll||Isa 53|Great Isaiah Scroll
nash-papyrus|heritage|Nash Papyrus||Exo 20|Nash Papyrus
p52|heritage|Rylands Papyrus P52||Jhn 18|Papyrus 52 recto
p66|heritage|Bodmer Papyrus P66||Jhn 1|Papyrus 66 John
p75|heritage|Bodmer Papyrus P75||Luk 24|Papyrus 75
p46|heritage|Chester Beatty Papyrus P46||Rom 1|Papyrus 46
p45|heritage|Chester Beatty Papyrus P45||Mrk 1|Papyrus 45
garima-gospels|heritage|Garima Gospels illumination||Jhn 1|Garima Gospels illumination
armenian-roslin|heritage|Armenian Gospel illumination||Luk 1:26|Toros Roslin Annunciation
rabbula-ascension|heritage|Rabbula Gospels: Ascension||Act 1:9|Rabbula Gospels Ascension
syriac-gospel|heritage|Syriac Gospel canon tables||Luk 1|Syriac Gospel canon tables
sarajevo-haggadah|heritage|Sarajevo Haggadah: biblical illumination||Exo 12|Sarajevo Haggadah illumination
vienna-genesis|heritage|Vienna Genesis: Rebecca at the well||Gen 24|Vienna Genesis Rebecca
rossano-gospels|heritage|Rossano Gospels: Good Samaritan||Luk 10:30|Rossano Gospels Samaritan
utrecht-psalter|heritage|Utrecht Psalter manuscript page||Psa 23|Utrecht Psalter manuscript
morgan-bible|heritage|Morgan Crusader Bible illumination||1Sa 17|Morgan Crusader Bible David
bible-saint-louis|heritage|Bible of Saint Louis manuscript page||Gen 1|Bible Saint Louis manuscript
codex-aureus|heritage|Codex Aureus of Echternach illumination||Luk 16:19|Codex Aureus Echternach Lazarus
rublev-trinity|heritage|Trinity icon|Andrei Rublev|Gen 18|Andrei Rublev Trinity
vladimir-icon|heritage|Theotokos of Vladimir||Luk 2|Theotokos Vladimir icon
sinai-ladder|heritage|Ladder of Divine Ascent icon||Mat 7:13|Ladder Divine Ascent Sinai icon
monreale-pantocrator|heritage|Monreale apse mosaic||Col 1:15|Monreale Christ Pantocrator mosaic
cefalu-pantocrator|heritage|Cefalù apse mosaic||Jhn 1|Cefalu Christ Pantocrator mosaic
hagia-sophia-deesis|heritage|Hagia Sophia Deësis mosaic||Heb 4:14|Hagia Sophia Deesis mosaic
ravenna-shepherd|heritage|Good Shepherd mosaic, Galla Placidia||Jhn 10:11|Galla Placidia Good Shepherd mosaic
san-vitale-abraham|heritage|San Vitale: Abraham's hospitality mosaic||Gen 18|San Vitale Abraham angels mosaic
san-vitale-melchizedek|heritage|San Vitale: Abel and Melchizedek mosaic||Heb 7|San Vitale Abel Melchizedek mosaic
ravenna-magi|heritage|Sant'Apollinare Nuovo: Magi mosaic||Mat 2:11|Sant Apollinare Nuovo Magi mosaic
chora-anastasis|heritage|Chora: Anastasis fresco||1Pe 3:18|Chora Anastasis fresco
ravenna-baptism|heritage|Neonian Baptistery: Baptism mosaic||Mat 3:13|Neonian Baptistery baptism mosaic
jerusalem-city|places|Jerusalem: Old City landscape||Psa 122|Jerusalem Old City Mount Olives panorama
mount-olives|places|Mount of Olives||Act 1:12|Mount Olives Jerusalem landscape
gethsemane|places|Gethsemane: traditional garden site||Mat 26:36|Gethsemane garden olive trees
kidron|places|Kidron Valley||Jhn 18:1|Kidron Valley Jerusalem
bethesda|places|Pool of Bethesda remains||Jhn 5:2|Pool Bethesda Jerusalem
siloam-pool|places|Pool of Siloam excavation||Jhn 9:7|Pool Siloam excavation
western-wall|places|Western retaining wall of the Temple platform||Mrk 13:1|Western Wall Jerusalem
city-david|places|City of David archaeological area||2Sa 5|City David archaeological Jerusalem
jericho|places|Tell es-Sultan: ancient Jericho||Jos 6|Tell es Sultan Jericho
bethlehem|places|Bethlehem: Church of the Nativity||Luk 2|Bethlehem Church Nativity exterior
nazareth|places|Nazareth landscape||Luk 4:16|Nazareth panorama
capernaum-synagogue|places|Capernaum: later synagogue remains||Mrk 1:21|Capernaum synagogue ruins
capernaum-shore|places|Capernaum and the Galilee shoreline||Mat 4:13|Capernaum Sea Galilee shore
bethsaida|places|Et-Tell: proposed Bethsaida site||Mrk 8:22|Et Tell Bethsaida ruins
sea-galilee|places|Sea of Galilee landscape||Mrk 4:35|Sea Galilee panorama
beatitudes|places|Mount of Beatitudes: traditional setting||Mat 5|Mount Beatitudes landscape
magdala|places|Magdala synagogue excavation||Luk 8:2|Magdala synagogue excavation
tabgha|places|Tabgha: later commemorative site||Mrk 6:30|Tabgha church exterior
mount-tabor|places|Mount Tabor: traditional Transfiguration site||Mat 17|Mount Tabor panorama
jordan-river|places|Jordan River||Mat 3:13|Jordan River Qasr Yahud
dead-sea|places|Dead Sea landscape||Gen 14|Dead Sea landscape
judean-desert|places|Judean wilderness||Luk 4:1|Judean desert landscape
ein-gedi|places|Ein Gedi oasis||1Sa 24|Ein Gedi oasis
qumran|places|Qumran caves and landscape||Isa 40|Qumran caves
masada|places|Masada archaeological site||Luk 21|Masada ruins
caesarea-theatre|places|Caesarea Maritima theatre||Act 10|Caesarea Maritima theatre
caesarea-aqueduct|places|Caesarea aqueduct||Act 23:23|Caesarea aqueduct
megiddo|places|Tel Megiddo||1Ki 9:15|Tel Megiddo ruins
hazor|places|Tel Hazor||Jos 11|Tel Hazor ruins
tel-dan|places|Tel Dan archaeological site||1Ki 12:29|Tel Dan archaeology
beersheba|places|Tel Beersheba||Gen 21:31|Tel Beersheba ruins
lachish|places|Tel Lachish||2Ki 18:14|Tel Lachish ruins
samaria|places|Samaria-Sebastia ruins||1Ki 16:24|Samaria Sebastia ruins
shiloh|places|Shiloh archaeological site||1Sa 1|Shiloh archaeological
hebron|places|Hebron: traditional patriarchal tomb complex||Gen 23|Cave Patriarchs Hebron exterior
shechem|places|Tell Balata: ancient Shechem||Jos 24|Tell Balata Shechem
mount-gerizim|places|Mount Gerizim||Jhn 4:20|Mount Gerizim landscape
mount-carmel|places|Mount Carmel landscape||1Ki 18|Mount Carmel landscape
negev|places|Negev wilderness||Gen 12:9|Negev desert landscape
sinai|places|Jebel Musa: traditional Mount Sinai||Exo 19|Mount Sinai Jebel Musa landscape
ephesus|places|Ephesus: Library of Celsus remains||Act 19|Ephesus Library Celsus
corinth|places|Ancient Corinth: Temple of Apollo||Act 18|Corinth Temple Apollo
areopagus|places|Athens: Areopagus||Act 17:22|Athens Areopagus
philippi|places|Philippi archaeological site||Act 16|Philippi forum ruins
thessaloniki|places|Thessaloniki: Roman forum||Act 17:1|Thessaloniki Roman forum
troas|places|Alexandria Troas ruins||Act 20:6|Alexandria Troas ruins
antioch-pisidia|places|Antioch of Pisidia ruins||Act 13:14|Antioch Pisidia ruins
pergamon|places|Pergamon acropolis||Rev 2:12|Pergamon acropolis
patmos|places|Patmos landscape||Rev 1:9|Patmos island panorama
rome|places|Rome: Roman Forum||Act 28|Roman Forum panorama
ancient-near-east|maps|Ancient Near East overview||Gen 11|Ancient Near East map English
patriarchs|maps|World of the patriarchs||Gen 12|Patriarchs Bible map
abraham-routes|maps|Abraham's journeys||Gen 12|Abraham journey map English
canaan-patriarchs|maps|Canaan in the patriarchal narratives||Gen 13|Canaan patriarchs map
jacob-journey|maps|Jacob's journey||Gen 28|Jacob journey map Bible
joseph-egypt|maps|Joseph and ancient Egypt||Gen 37|Joseph Egypt Bible map
exodus-route|maps|Exodus route: interpretive map||Exo 12|Exodus map English
sinai-wilderness|maps|Sinai wilderness: proposed locations||Exo 19|Sinai peninsula Exodus map
wilderness-wanderings|maps|Wilderness journeys: interpretive map||Num 33|Israelites wilderness wanderings map
moab|maps|Moab and the Transjordan||Num 22|Moab Ammon Edom map
conquest|maps|Joshua narratives: Canaan||Jos 1|Joshua conquest Canaan map
tribal-allotments|maps|Tribal allotments: interpretive map||Jos 13|Twelve tribes Israel map English
judges|maps|World of the judges||Jdg 1|Judges Israel map
philistines|maps|Philistine cities||1Sa 5|Philistia cities map
saul|maps|Israel in the narratives of Saul||1Sa 9|Saul kingdom map
_david|maps|Kingdom of David: interpretive map||2Sa 8|David kingdom map
_solomon|maps|Solomon's kingdom: interpretive map||1Ki 4|Solomon kingdom map
divided-kingdom|maps|Israel and Judah||1Ki 12|Kingdom Israel Judah map English
assyria|maps|Neo-Assyrian Empire||2Ki 17|Neo Assyrian Empire map English
babylonia|maps|Neo-Babylonian Empire||Dan 1|Neo Babylonian Empire map English
exile|maps|Babylonian exile: interpretive routes||2Ki 25|Babylonian exile map
persia|maps|Achaemenid Persian Empire||Ezr 1|Achaemenid Empire map English
return-exile|maps|Return from exile: interpretive map||Ezr 2|Return exile Ezra map
nehemiah-jerusalem|maps|Jerusalem in Nehemiah: reconstruction||Neh 3|Nehemiah Jerusalem map
hellenistic|maps|Hellenistic eastern Mediterranean||Dan 8|Hellenistic kingdoms map English
hasmonean|maps|Hasmonean Judea||Luk 1|Hasmonean kingdom map English
herod-kingdom|maps|Herod's kingdom||Mat 2|Herod kingdom map English
roman-palestine|maps|Judea and Galilee in the Roman period||Luk 3|Palestine time Jesus map English
galilee|maps|Galilee and surrounding districts||Mat 4|Galilee Jesus map English
jesus-ministry|maps|Jesus' ministry: interpretive map||Mrk 1|Jesus ministry map English
jordan-region|maps|Jordan Valley||Mat 3|Jordan valley map English
jerusalem-jesus|maps|Jerusalem in the time of Jesus: reconstruction||Mrk 11|Jerusalem Jesus time map English
passion-jerusalem|maps|Passion narratives: Jerusalem sites||Jhn 18|Jerusalem passion map
herods-temple|maps|Herod's Temple: reconstructed plan||Jhn 2|Herod temple plan English
tabernacle-plan|maps|Tabernacle: interpretive plan||Exo 25|Tabernacle plan English
solomons-temple|maps|Solomon's Temple: interpretive plan||1Ki 6|Solomon temple plan English
roman-empire|maps|Roman Empire in the first century||Rom 1|Roman Empire first century map English
acts-world|maps|Eastern Mediterranean world of Acts||Act 1|Acts Bible Mediterranean map
paul-first|maps|Paul's first journey: interpretive map||Act 13|Paul first missionary journey map English
paul-second|maps|Paul's second journey: interpretive map||Act 16|Paul second missionary journey map English
paul-third|maps|Paul's third journey: interpretive map||Act 18|Paul third missionary journey map English
paul-rome|maps|Paul's voyage to Rome: interpretive map||Act 27|Paul journey Rome map English
asia-minor|maps|Asia Minor||Act 16|Asia Minor ancient map English
macedonia|maps|Macedonia and Achaia||Act 16|Macedonia Achaia map Roman
cyprus|maps|Ancient Cyprus||Act 13:4|Ancient Cyprus map English
crete|maps|Ancient Crete||Tit 1|Ancient Crete map English
seven-churches|maps|Seven churches of Revelation||Rev 1:11|Seven churches Revelation map English
patmos-aegean|maps|Patmos and the Aegean||Rev 1:9|Patmos Aegean map
rome-ancient|maps|Ancient Rome: city plan||Act 28|Ancient Rome city plan English
jerusalem-region|maps|Jerusalem and surrounding terrain||Luk 19|Jerusalem topographic map
`;
export const TARGETS = rows.trim().split('\n').map((row) => {
  const [rawId, pack, title, creator, reference, query, file] = row.split('|');
  const id = `${pack}-${rawId.replace(/^_/, '')}`;
  return { id, pack, title, creator: creator || undefined, reference, query, ...(file ? { file } : {}) };
});
export const COLLECTION_GOALS = { masterworks: 100, maps: 50, artifacts: 75, heritage: 40, places: 50 };
export const ICONIC_TARGETS = ['masterworks-leonardo-supper', 'masterworks-michelangelo-adam', 'masterworks-caravaggio-matthew', 'masterworks-van-eyck-ghent', 'heritage-michelangelo-pieta', 'heritage-sistine-ceiling', 'heritage-sinai-icon'];

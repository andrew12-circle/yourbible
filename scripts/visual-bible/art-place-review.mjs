const dates = {
 'leonardo-supper':'1495–1498','leonardo-magi':'1481–1482; unfinished','raphael-transfiguration':'1516–1520','raphael-fishing':'c. 1515–1516',
 'titian-annunciation':'c. 1563–1565','tintoretto-cross':'1565','rubens-raising':'1610–1611','angelico-san-marco':'c. 1440–1445',
 'masaccio-expulsion':'c. 1424–1427','giotto-lamentation':'c. 1304–1306','botticelli-cestello':'1489–1490','grunewald-crucifixion':'1512–1516',
 'latour-magdalene':'17th century','mantegna-lamentation':'Late 15th century; dating debated','caravaggio-entombment':'Early 17th century',
 'van-eyck-ghent':'1432','van-eyck-lamb':'1432','tanner-lazarus':'1896–1897',
};
const makers={ Rembrandt:'Rembrandt (Rembrandt van Rijn)', Caravaggio:'Caravaggio (Michelangelo Merisi)', Tintoretto:'Jacopo Tintoretto (Jacopo Robusti)', 'Sandro Botticelli':'Botticelli (Alessandro di Mariano Filipepi)', Giotto:'Giotto di Bondone' };
const themes=new Set('leonardo-rocks leonardo-john raphael-sistine-madonna raphael-meadow raphael-ezekiel rembrandt-family zurbaran-lamb latour-magdalene latour-joseph moreau-apparition martin-wrath martin-heaven blake-ladder hunt-light millais-parents'.split(' '));
const frescoes=new Set('michelangelo-adam michelangelo-fall michelangelo-flood michelangelo-judgement angelico-san-marco masaccio-tribute masaccio-expulsion masolino-temptation giotto-lamentation giotto-kiss perugino-keys'.split(' '));
const traditions={
 leonardo:['Renaissance','Italian'],michelangelo:['Renaissance','Italian'],raphael:['Renaissance','Italian'],caravaggio:['Baroque','Italian'],rembrandt:['Baroque','Dutch'],vermeer:['Baroque','Dutch'],veronese:['Renaissance','Italian'],titian:['Renaissance','Italian'],tintoretto:['Renaissance / Mannerism','Italian'],rubens:['Baroque','Flemish'],'van-dyck':['Baroque','Flemish'],poussin:['Baroque classicism','French'],claude:['Baroque classicism','French'],zurbaran:['Baroque','Spanish'],murillo:['Baroque','Spanish'],rogier:['Early Netherlandish','Flemish'],bosch:['Early Netherlandish','Netherlandish'],bruegel:['Northern Renaissance','Netherlandish'],cranach:['Northern Renaissance','German'],angelico:['Early Renaissance','Italian'],masaccio:['Early Renaissance','Italian'],masolino:['Early Renaissance','Italian'],giotto:['Medieval / early Italian painting','Italian'],botticelli:['Renaissance','Italian'],mantegna:['Renaissance','Italian'],bellini:['Renaissance','Italian'],perugino:['Renaissance','Italian'],grunewald:['Northern Renaissance','German'],honthorst:['Baroque','Dutch'],latour:['Baroque','French'],champaigne:['Baroque','French'],delacroix:['Romanticism','French'],moreau:['Symbolism','French'],martin:['Romanticism','British'],blake:['Romanticism','British'],hunt:['Pre-Raphaelite','British'],millais:['Pre-Raphaelite','British'],tanner:['19th-century sacred painting','African American'],bloch:['19th-century sacred painting','Danish'],hofmann:['19th-century sacred painting','German'],'van-eyck':['Early Netherlandish','Flemish'],
};
const institutions={
 'leonardo-supper':'Santa Maria delle Grazie, Milan','michelangelo-adam':'Sistine Chapel, Vatican','michelangelo-fall':'Sistine Chapel, Vatican','michelangelo-flood':'Sistine Chapel, Vatican','michelangelo-judgement':'Sistine Chapel, Vatican','van-eyck-ghent':"Saint Bavo's Cathedral, Ghent",'van-eyck-lamb':"Saint Bavo's Cathedral, Ghent",'caravaggio-matthew':'San Luigi dei Francesi, Rome','leonardo-rocks':'Musée du Louvre','leonardo-john':'Musée du Louvre','leonardo-annunciation':'Uffizi Galleries','leonardo-magi':'Uffizi Galleries','raphael-transfiguration':'Vatican Museums','caravaggio-entombment':'Vatican Museums','caravaggio-emmaus':'National Gallery, London','caravaggio-isaac':'Uffizi Galleries','rembrandt-belshazzar':'National Gallery, London','rembrandt-emmaus':'Musée du Louvre','vermeer-martha':'National Galleries of Scotland','veronese-cana':'Musée du Louvre','veronese-emmaus':'Musée du Louvre','titian-noli':'National Gallery, London','titian-annunciation':'San Salvador, Venice','tintoretto-supper':'San Giorgio Maggiore, Venice','tintoretto-cross':'Scuola Grande di San Rocco, Venice','zurbaran-lamb':'Museo Nacional del Prado','murillo-shepherds':'Museo Nacional del Prado','rogier-descent':'Museo Nacional del Prado','bosch-magi':'Museo Nacional del Prado','angelico-prado':'Museo Nacional del Prado','angelico-san-marco':'San Marco, Florence','botticelli-cestello':'Uffizi Galleries','botticelli-mystic':'National Gallery, London','bellini-agony':'National Gallery, London','perugino-keys':'Sistine Chapel, Vatican','mantegna-lamentation':'Pinacoteca di Brera','latour-joseph':'Musée du Louvre','tanner-annunciation':'Philadelphia Museum of Art',
};
const particular={
 'leonardo-supper':{description:"The complete mural centers Christ among the reacting apostles at the announcement of betrayal. The room's perspective focuses attention on the central figure.",caution:'This is the surviving mural, not a later painted copy. Its present appearance includes loss, conservation and restoration; do not treat it as an eyewitness reconstruction.',medium:'Painting on a dry wall surface, reproduced'},
 'michelangelo-adam':{description:'The two approaching hands form the visual center of Michelangelo’s creation scene. The full selected panel is preserved rather than reduced to a crop of the fingers.',caution:'A Renaissance interpretation of Genesis. The bodily forms, surrounding figures and precise gesture are artistic additions.',workGroup:'michelangelo-sistine-ceiling'},
 'caravaggio-matthew':{description:'A shaft of light and a pointing gesture draw attention into a group around a table. The full composition preserves the drama of the call.',caution:'Caravaggio places the calling in an imagined early-modern setting. The lighting, clothing and some figure identifications are matters of artistic interpretation.'},
 'van-eyck-ghent':{description:'The open polyptych brings multiple panels into one theological ensemble. Use the large viewer to follow the relationship between the central Lamb and the surrounding worshippers.',caution:'A complex later theological work with several panels and conservation states. It is not a literal illustration of a single instant in Revelation.',workGroup:'ghent-altarpiece',relationship:'thematic'},
 'van-eyck-lamb':{description:'The central Lamb panel is presented as a separately identified view of the Ghent Altarpiece, allowing closer examination of the gathered worshippers and landscape.',caution:'This is a panel from the same altarpiece, not a second independent work. Its symbolism interprets Scripture through later Christian tradition.',workGroup:'ghent-altarpiece',relationship:'thematic'},
 'raphael-fishing':{medium:'Cartoon for a tapestry, reproduced',caution:'This is Raphael’s tapestry cartoon, not the finished woven tapestry or a photograph of Galilean fishing.'},
 'veronese-levi':{caution:'The expansive banquet includes many figures and architectural details absent from Luke. The work’s historical title and later discussion should not be mistaken for exact biblical description.'},
 'rembrandt-storm':{holdingCollection:'Isabella Stewart Gardner Museum collection record; work stolen in 1990',caution:'A dramatic narrative interpretation. The work is not currently presented here as physically on display at its recorded museum.'},
 'martin-wrath':{caution:'An imaginative apocalyptic painting, not a predictive chart, geographical reconstruction or evidence of a future event’s appearance.'},
 'martin-heaven':{caution:'A visionary nineteenth-century landscape, not a factual depiction of heaven or a literal map of Revelation.'},
 'hunt-light':{caution:'A devotional allegory associated with Revelation 3:20, not a Gospel scene or a literal portrait of the risen Christ.'},
 'latour-joseph':{caution:'The workshop setting develops a devotional tradition about Joseph and Jesus. Matthew does not describe this particular scene.'},
};
export function artReview(target,candidate){
 const key=target.id.slice('masterworks-'.length);
 const family=Object.keys(traditions).sort((a,b)=>b.length-a.length).find(prefix=>key.startsWith(prefix+'-'));
 const [period,culture]=traditions[family]||['Historical sacred art','See source record'];
 const rawDate=candidate.date.split(/\s+date QS:|\s+Baroque\b|\s+Mannerism\b/)[0].trim();
 const date=dates[key]||(rawDate&&/\d/.test(rawDate)?rawDate:'Historical work; precise date not supplied in source metadata');
 const creator=makers[target.creator]||target.creator||candidate.creator;
 const relationship=themes.has(key)?'thematic':'depiction';
 const data={date,creator,period,culture,technique:frescoes.has(key)?'fresco':'painting',medium:frescoes.has(key)?'Fresco, reproduced':'Historical painting; see source for support and technique',relationship,
 description:`${target.title} by ${creator}. The complete composition offers a distinct artistic interpretation alongside the associated Scripture. Compare the figures, setting and treatment of light with other artists' versions.`,
 caution:relationship==='thematic'?'A later devotional or thematic interpretation, not an eyewitness record or a claim that every depicted detail appears in the passage.':'The artist supplies clothing, setting, gestures and symbolic details beyond the biblical text. The reproduction is not an eyewitness or archaeological reconstruction.',
 ...(institutions[key]?{holdingCollection:institutions[key]}:{}),...particular[key]};
 if(key.startsWith('michelangelo-')&&key!=='michelangelo-judgement')data.workGroup='michelangelo-sistine-ceiling';
 if(candidate.license.label.startsWith('CC BY')&&candidate.creator!==target.creator&&candidate.creator!==creator)data.photographer=candidate.creator;
 if(['leonardo-rocks','raphael-sistine-madonna','raphael-meadow','rembrandt-family','latour-magdalene','latour-joseph','millais-parents'].includes(key))data.inline=false;
 if(key==='raphael-fishing')data.reference='Luk 5:6';
 data.passageNote=data.relationship==='thematic'?'A thematic or devotional connection; this work does not claim to depict a separately documented episode.':'An editorial association with the biblical subject; artistic details should be compared with the passage rather than added to it.';
 return data;
}
const placeChanges={
 kidron:{title:'Kidron Valley: historical photograph',historical:true},
 'city-david':{title:'Jerusalem and the southern hill: historical photograph',date:'1936 photograph',historical:true},
 samaria:{title:'Samaria-Sebastia: historical view of the colonnade',historical:true},
 sardis:{title:'Sardis temple columns: historical daguerreotype',date:'1843 photograph',historical:true},
 'capernaum-synagogue':{caution:'The visible white-limestone synagogue is a later building, not the first-century structure in which Jesus taught.'},
 bethsaida:{title:'Et-Tell: Iron Age gate at a proposed Bethsaida site',caution:'These remains are much earlier than the Gospel period. Identifying Et-Tell with New Testament Bethsaida is debated.'},
 'mount-tabor':{title:'Landscape seen from Mount Tabor',caution:'The photograph looks from Mount Tabor; its association with the Transfiguration is traditional rather than explicitly named in the Gospels.'},
 'tel-dan':{title:'Tel Arad: reconstructed Judahite fortress',reference:'2Ki 23',caution:'This photograph shows Tel Arad, not Tel Dan. Portions of the visible structure are reconstructed; the chapter connection is regional religious-history context.'},
 qumran:{caution:'Qumran is relevant to the preservation and discovery of ancient manuscripts. The association does not place the events or author of Isaiah at this site.',relationship:'textual-history'},
 masada:{caution:'This site gives context for Roman-period Judea and its later conflicts. Luke does not narrate Jesus visiting Masada.'},
 ephesus:{caution:'The Library of Celsus is a second-century CE structure, later than Paul. It illustrates the city’s later Roman appearance, not a building he necessarily saw.'},
 hebron:{caution:'The association of this complex with the patriarchal tombs is traditional. The exterior photograph does not establish the identity of individual burials.'},
 'sinai-egypt':{title:"Saint Catherine's Monastery beneath the Sinai peaks",caution:'Jebel Musa is a traditional identification of Mount Sinai. The photograph does not establish the location of the Exodus event, and the monastery is much later.'},
 'gerizim-nablus':{title:'Nablus and Mount Gerizim',caution:'Modern buildings are visible. The mountain supplies geographic context, not a reconstruction of the first-century settlement.'},
 pompeii:{title:'Pompeii: Via di Nola and Roman streets',relationship:'cultural-context',caution:'A comparison for the Roman urban environment, not a claim that Paul visited Pompeii or that Acts 28 describes this street.'},
};
const traditional=new Set('gethsemane beatitudes tabgha bethlehem'.split(' '));
export function placeReview(target,candidate){
 const key=target.id.slice('places-'.length),change=placeChanges[key]||{};
 const date=change.date||(candidate.date?`Photograph: ${candidate.date}`:'Photograph; capture date not supplied in source metadata');
 const title=change.title||target.title;
 const historical=change.historical===true;
 const caution=change.caution||(traditional.has(key)?'This is a traditional or commemorative site association. The visible buildings and landscape are not a reconstruction of the biblical event.':'The photograph shows surviving geography or remains with later development, conservation and restoration. Not every visible structure dates to the period of the passage.');
 return {title,date,creator:candidate.creator||'Photographer not identified in source metadata',photographer:candidate.creator||undefined,
 reference:change.reference||target.reference,relationship:change.relationship||'geography',technique:'photograph',period:historical?'Historical site photography':'Modern site photography',culture:'Biblical geography and archaeological sites',medium:historical?'Historical photograph or archival reproduction':'Site or landscape photograph',
 description:`${title}. ${historical?'This archival view records the place at the time of the photograph.':'Use the visible terrain, distances and surviving structures to orient the reading.'}`,
 caution,passageNote:`Geographic or historical context alongside ${change.reference||target.reference}. ${caution}`};
}

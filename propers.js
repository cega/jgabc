window.matchMedia = window.matchMedia || function() { return { matches: false }};
var selDay,selTempus='',selPropers,selOrdinaries={},selCustom={},sel={
  tractus:{},
  offertorium:{},
  introitus:{},
  graduale:{},
  communio:{},
  alleluia:{},
  sequentia:{},
  asperges:{},
  kyrie:{},
  gloria:{},
  credo:{},
  preface:{},
  sanctus:{},
  agnus:{},
  ite:{}
},includePropers=[],
paperSize=localStorage.paperSize || 'letter',
pageBreaks=(localStorage.pageBreaks || "").split(','),
// Taken from the Chants Abrégés (http://media.musicasacra.com/pdf/chantsabreges.pdf) [They are found throughout the book, wherever Alleluia verses are found]:
  alleluiaChantsAbreges=[
    undefined,
    "(c4)Al(c)le(d)lu(ixed/hi)ia.(hvhvGE//fd.) (::)",
    "(f3)Al(ef~)le(f)lu(hf/fe~)ia.(egf.) (::)",
    "(c4)Al(e/ef)le(dg)lu(gih___!iwj)ia.(ijh'___/ig/ge.) (::)",
    "(c4)Al(e//ed~)le(e/ghe/fe)lu(de~)ia.(e.) (::)",
    "(c3)Al(d/f'h~)le(hf__)lu(fh'/ih~)ia.(i.////hiHF'/fd.) (::)",
    "(c4)Al(f/fg)le(gf)lu(ixf!gi//hig//g)ia.(gf..) (::)",
    "(c3)Al(ef)le(e)lu(e!f'h/ihi)ia.(ie..) (::)",
    "(c4)Al(g)le(hvGF/ghg)lu(fh!jvIG'h)ia.(g.) (::)"
  ],
  isNovus = false,
  novusOption={},
  yearArray = ['A','B','C'];
$(function(){
  var reFullBarsWithNoPunctuation = /([^;:,.!?\s])\s*\*/g;
  var reHalfBarsWithNoPunctuation = /([^;:,.!?\s])\s*\|/g;
  var reBarsWithNoPunctuation = /([^;:,.!?\s])\s*[|*]/g;
  var reFullBars = /\s*\*\s*/g;
  var reFullBarsOrFullStops = /(?:([^\d\s])[:;.?!]?\s*\*|([^\d\s])[:;.?!]\s(?!\s*Amen))\s*/g;
  var reHalfBars = /\s*\|\s*/g;
  var reFullOrHalfBars = /\s*[*|]\s*/g;
  var reFullOrHalfBarsOrFullStops = /(?:([^\d\s][:;.?!]?)\s*[*|]|([^\d\s][:;.?!])\s(?!\s*Amen))\s*/g;
  var reCommaWords = /[,]\s/g;
  var reFullStops = /[.:;!?]\s/g;
  var reVowels = /[aeiouyáéíóúýæǽœ]/ig;
  function reduceStringArrayBy(array,period) {
    if(array.length < period) return array;
    return array.reduce(function(result,o,i) {
      if(!result) result = '';
      if(!o) o = '';
      if(typeof(result) == 'string') result = [result];
      if(i % period === 0) {
        result.push(o);
      } else {
        result[result.length - 1] += o;
      }
      return result;
    });
  }
  var LocationHash = function(hash) {
    var regexKeyVal = /#([^=#]+)(?:=([^#]+))?/g;
    var curMatch;
    while(curMatch = regexKeyVal.exec(hash)) {
      this[curMatch[1]] = (typeof(curMatch[2])=='undefined')? true : decodeURIComponent(curMatch[2]);
    }
    if(Object.keys(this).length == 1 && ('hash' in this)) {
      return new LocationHash(this.hash);
    }
    return this;
  };
  LocationHash.prototype.toString = function() {
    var result = '';
    var hash = this;
    if(!hash.selSundayNovus) delete hash.selYearNovus;
    Object.keys(hash).forEach(function(key) {
      switch(typeof(hash[key])) {
        case 'boolean':
          if(hash[key]) result += '#' + key;
          break;
        case 'string':
          if(hash[key].match(/\.\.\.$/) || hash[key].length==0) break;
          // otherwise, fall through to default:
        default:
          result += '#' + key + '=' + hash[key];
          break;
      }
    });
    return result;
  }
  function parseHash() {
    if(!LocationHash) return null;
    return new LocationHash(location.hash);
  }
  var gregobaseUrlPrefix = 'http://gregobase.selapa.net/chant.php?id=';
  var $gradualeOptions = $('#selStyleGraduale>option').clone();
  var $alleluiaOptions = $('#selStyleAlleluia>option').clone();
  var NBSP = '\xA0';
  // the following function is based on one taken from http://www.irt.org/articles/js052/index.htm
  var dateCache = {};
  var Dates = function(Y) {
    if(dateCache[Y]) return dateCache[Y];
    var result = {};
    result.year = Y;
    result.pascha = moment.easter(Y);
    result.septuagesima = moment(result.pascha).subtract(7*9,'days');
    result.quad1 = moment(result.septuagesima).add(7*3,'days');
    result.ascension = moment(result.pascha).add(39,'days');
    result.pentecost = moment(result.pascha).add(49,'days');
    result.nativitas = moment([Y,11,25]);
    result.advent1 = moment(result.nativitas).subtract((result.nativitas.day() || 7) + 7*3,'days');
    result.corpusChristi = moment(result.pentecost).add(11,'days');
    result.sacredHeart = moment(result.pentecost).add(19,'days');
    result.ChristusRex = moment([Y,9,31]);
    result.ChristusRex.subtract(result.ChristusRex.day(),'days');
    result.epiphany = moment([Y,0,6]);
    result.transferredFeasts = {};
    // The Feast of the Holy Family is on the Sunday following Epiphany, unless Epiphany falls on a Sunday,
    // in which case The Holy Family will be on the Saturday following.
    result.holyFamily = moment(result.epiphany).add(7 - (result.epiphany.day()||1), 'days');
    dateCache[Y] = result;
    return result;
  };
  var coincidesWithFirstClassPropriumTemporum = function(mo, transferIfSunday) {
    var dates = Dates(mo.year());
    mo = moment(mo).startOf('day');
    var daysAfterLent1 = mo.diff(dateForSundayKey('Quad1',dates),'day');
    if(mo.isSame(dateForSundayKey('5aw',dates)) || (daysAfterLent1 % 7 == 0 && daysAfterLent1 >= 0 && daysAfterLent1 <= 28)) {
      return mo;
    } else {
      var start = moment(dates.pascha).add(-1,'week'),
          end = moment(dates.pascha).add(1,'week');
      if(mo.isBetween(start,end,'day','[]')) {
        return end;
      }
    }
    if(transferIfSunday && mo.day()==0) return mo;
  }
  // gets special date for a first class feast that falls on Ash Wednesday, or a Sunday of Lent, or between Palm Sunday and Low Sunday
  var getSpecialDateForFeast = function(m) {
    var key = m.format('MMMD'),
        feast = firstClassSaints[key],
        mo = feast && coincidesWithFirstClassPropriumTemporum(m, feast.transferIfSunday);
    if(mo) {
      var dates = Dates(m.year());
      if(key in dates) return dates[key];
      mo.add(1,'day');
      var newKey;
      while((newKey = mo.format('MMMD')) in firstClassSaints || newKey in dates.transferredFeasts) {
        mo.add(1,'day');
      }
      dates[key] = mo;
      dates.transferredFeasts[newKey] = firstClassSaints[key];
      return dates[key];
    }
    return m;
  }
  var dateForSundayKey = function(key, dates) {
    var weekdayKeys = ['m','t','w','h','f','s'];
    var m;
    if(key.match(/^[A-Z][a-z]{2}\d{1,2}/)) {
      m = moment(key.replace(/_.+$/,''),'MMMD');
      if(m.isValid()) return m;
    }
    dates = dates || Dates(moment().year());
    var match;
    if(match = key.match(/Adv(\d)(Wed|Fri|Sat)?/)) {
      m = moment(dates.advent1);
      m.add(parseInt(match[1])-1, 'weeks');
      if(match[2]) m.add("sMTWRFS".indexOf(match[2][0]), 'days');
    } else if(match = key.match(/Epi(\d)/)) {
      if(match[1]==3) return moment(dates.septuagesima).subtract(1, 'week');
      m = moment(dates.epiphany);
      m = m.add(parseInt(match[1]), 'weeks').subtract(m.day()||(match[1]==1?1:0), 'days');
    } else if(match = key.match(/Quad(\d)([mtwhfs]|Sat)?/)) {
      m = moment(dates.septuagesima).add(2 + parseInt(match[1]), 'weeks');
      if(match[2]) {
        var day = (match[2]=='Sat')? 6 : 1 + weekdayKeys.indexOf(match[2]);
        m = m.add(day, 'day');
      }
    } else if(match = key.match(/Pasc(\d)([mtwhfs])?/)) {
      m = moment(dates.pascha).add(parseInt(match[1]), 'weeks');
      if(match[2]) {
        var day = 1 + weekdayKeys.indexOf(match[2]);
        m = m.add(day, 'day');
      }
    } else if(match = key.match(/Pent(\d+)([mtwhfs])?/)) {
      if(match[1] == 23) {
        return moment(dates.advent1).subtract(1, 'week');
      }
      m = moment(dates.pentecost).add(parseInt(match[1]), 'weeks');
      if(match[2]) {
        var day = 1 + weekdayKeys.indexOf(match[2]);
        m = m.add(day, 'day');
      }
    } else if(match = key.match(/([765])a([mtwhfs])?/)) {
      var weeksAfter = 7 - match[1];
      m = moment(dates.septuagesima).add(weeksAfter, 'weeks');
      if(match[2]) {
        var day = 1 + weekdayKeys.indexOf(match[2]);
        m = m.add(day, 'day');
      }
    }
    if(m && m.isValid()) return m;
    switch(key) {
      case "Nat1":
        m = moment('12-25','MM-DD').add(1, 'week');
        m = m.subtract(m.day(), 'days');
        break;
      case "Nat2":
        ///Sunday between 01/01 and 01/06, or, with this lacking, 2 January:: The most holy Name of Jesus, II class
        m = moment('01-06','MM-DD');
        m = m.subtract(m.day(), 'days');
        if(m.isSameOrAfter(moment('01-06','MM-DD')) || m.isSameOrBefore(moment('01-01','MM-DD'))) m = moment('01-02','MM-DD');
        break;
      case "Epi":
        return dates.epiphany;
      case "Asc":
        return dates.ascension;
      case "CorpusChristi":
        return dates.corpusChristi;
      case "SCJ":
        return dates.sacredHeart;
      case "EmbWedSept":
      case "EmbFriSept":
      case "EmbSatSept":
      case "EmbSatSeptS":
        var tmp = key[3];
        tmp = "sMTWRFS".indexOf(tmp);
        m = moment('09-21','MM-DD');
        m = m.subtract(m.day(), 'days').add(tmp, 'days');
        if(key=="EmbSatSeptS") m.add(1,'minute'); // put the shorter form below in the list...
        break;
      case "ChristusRex":
        return dates.ChristusRex;
      default:
        m = moment();
    }
    return m;
  }
  var partAbbrev = {
    verse:'V/.',
    tractus:'Tract.',
    offertorium:'Offert.',
    introitus:'Intr.',
    graduale:'Grad.',
    communio:'Comm.',
    sequentia: 'Seq.',
    hymnus: 'Hymn.',
    antiphona: "Ant.",
    responsorium: "Resp.",
    canticum: "Cant."
  };
  var defaultTermination={
    '1':'f',
    '3':'a',
    '4':'E',
    '7':'a',
    '8':'G'
  }
  var regexGabcGloriaPatri = /Gl[oó]\([^)a-mA-M]*([a-m])[^)]*\)ri\([^)]+\)a\([^)]+\)\s+P[aá]\([^)]+\)tri\.?\([^)]+\)\s*\(::\)\s*s?[aeæ]+\([^)]+\)\s*c?u\([^)]+\)\s*l?[oó]\([^)]+\)\s*r?um?\.?\([^)]+\)\s*[aá]\(([^)]+)\)\s*m?en?\.?\(([^)]+)\)/i;
  var regexGabcGloriaPatriEtFilio = /Gl[oó]\([^)]+\)ri\([^)]+\)a\([^)]+\)\s+P[aá]\([^)]+\)tri[.,]?\([^)]+\).*\(::\)/i;
  var regexGabcClef = /\([^)]*([cf]b?[1-4])/;
  var removeDiacritics=function(string) {
    if(typeof(string) != 'string') return '';
    return string.replace(/á/g,'a').replace(/é|ë/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ý/g,'y').replace(/æ|ǽ/g,'ae').replace(/œ/g,'oe').replace(/[,.;?“”‘’"':]/g,'');
  };
  var getGabcForPropers=function(propers,part,text){
    var id = propers[part + 'ID'];
    if(id) { return id; }
    var proper = text || propers[part];
    var ids = chantID[part];
    var properLines = proper.split('\n');
    var i=0;
    var firstLine = properLines[i];
    while(firstLine[0]=='!') {
      firstLine = properLines[++i];
    }
    firstLine = firstLine.replace(/^v.\s+/i,'');
    firstLine = removeDiacritics(firstLine.toLowerCase());
    firstWords = firstLine.split(/\s+/);
    var n = 1;
    while(!id) {
      id = ids[firstWords.slice(0,n++).join(' ')];
      if(n > firstWords.length) return;
    }
    if(id.psalm) {
      var psalm = properLines[++i];
      while(psalm.slice(0,3)!='!Ps') {
        psalm = properLines[++i];
      }
      psalm = properLines[++i];
      psalm = removeDiacritics(psalm.toLowerCase());
      psalmWords = psalm.split(/\s+/);
      n = 1;
      var idd;
      while(!idd) {
        idd = id.psalm[psalmWords.slice(0,n++).join(' ')];
        if(n > psalmWords.length) return;
      }
      id = idd;
    }
    if(id.Solesmes) id = id.Solesmes;
    if(id.Vatican) id = id.Vatican;
    console.info(id);
    return id.id;
  };
  var parseGraduale = function(graduale) {
    graduale = graduale.replace(/lleluia/g,'llelúja');
    var match = /^([^}]*?)Allelúja, allelúja[.,]?\s+([^}]*)/.exec(graduale);
    var result = {};
    if(match) {
      if(match[1]) result.graduale = match[1];
      result.alleluia = match[2];
    } else {
      match = /(![^\n]+[^}]+)\n(![^}]+)/.exec(graduale);
      if(!match) return {graduale:graduale};
      result.graduale = match[1];
      result.tractus = match[2];
    }
    return result;
  }
  function runGabcReplaces(gabc, gabcHeader) {
    // TODO: some of these should be run within download-gabc instead...
    gabc = gabc.replace(/\s+$/,'').replace(/<sp>V\/<\/sp>\./g,'<sp>V/</sp>')
          // some gregobase chants are encoded this way (two underscores for three note episema), and at least in the version of Gregrio on illuminarepublications.com, this does not work as desired.
          .replace(/\+(?=[^()]*\()/g,'†')
          .replace(/(<sp>[arvARV]\/<\/sp>)\./g,'$1')
          .replace(/<v>\$\\guillemotleft\$<\/v>/g,'«')
          .replace(/<v>\$\\guillemotright\$<\/v>/g,'»')
          .replace(/(aba|[a-b]c[a-b]|[a-c]d[a-c]|[a-d]e[a-d]|[a-e]f[a-e]|[a-f]g[a-f]|[a-g]h[a-g]|[a-h]i[a-h]|[a-i]j[a-i]|[a-j]k[a-j]|[a-k]l[a-k]|[a-l]m[a-l])\.*__(?!_)/g,'$&_')
          .replace(/ae/g,'æ').replace(/oe/g,'œ').replace(/aé/g,'ǽ').replace(/A[Ee]/g,'Æ').replace(/O[Ee]/g,'Œ')
          .replace(/<i>\((.*?)\)<\/i>/, '<i>$1</i>') // these parenthetical italicised notes are rubrics, found in 635 and 1236.gabc
          .replace(/!\//g,'/') // some gregobase chants are encoded this way for some reason
          .replace(/(\w)(\s+)([^()|a-z†*]+(<\/?\w+>)*\([^)]*\))/gi,'$1$3$2') // change things like "et :(gabc)" to "et:(gabc) "
          .replace(/(\s[^()\w†*]+) +(\w+[^\(\s]*\()/g,'$1$2') // change things like "« hoc" to "«hoc"
          .replace(/\s*\n\s*/g,'\n')
          .replace(/\s{2,}/g,' ')
          .replace(/\)\s*<i>(?:<v>[()]<\/v>|[^()])+\(\)$/,')') // get rid of things like  <i>at Mass only.</i><v>)</v>() that come at the very end.  This is only in 30.gabc and 308.gabc
    var match = gabc.match(/<sp>V\/<\/sp>(?! \d)/g);
    if(match && match.length > 1 && !gabc.match(/<sp>R\/<\/sp>\./)) {
      var count = 2;
      gabc = gabc.replace(/<sp>V\/<\/sp>(?! \d)/g, function(match) { return match + ' ' + (count++) + '.'});
    }
    if(gabcHeader && /Sequentia|Hymnus/.exec(gabcHeader.officePart) && !gabc.match(/\b\d+\. /)) {
      var count = 2;
      gabc = gabc.replace(/\(::\)\s+(?=.*\([a-m]\))(?!\d|<sp>|A\([^)]+\)men\.\([^)]+\))/g, function(match) { return match + (count++) + '. '});
    }
    return gabc;
  }
  var romanNumeral = ['','i','ii','iii','iv','v','vi','vii','viii'];
  var updatePart = function(part, ordinaryName) {
    var selPO = $.extend({},selPropers,selOrdinaries,selCustom);
    var id;
    var incipit;
    var match = part.match(/^([a-z]+)(\d+)$/i);
    var partIndex = 0;
    var partType = part;
    if(match) {
      partType = match[1];
      partIndex = parseInt(match[2]);
    }
    var capPart = part[0].toUpperCase()+part.slice(1);
    var $div = $('#div'+capPart)
    $div.find('.block.right .psalm-editor').remove();
    var $extraChantsPlaceholder = $div.next('.extra-chants');
    var isOrdinaryPart = $div.is('.ordinary') || $div.is('[custom-chant]');
    if(selPropers && (selPropers[part] === false || (selPropers.ordinary === false && isOrdinaryPart))) {
      $div.hide();
      return; 
    }
    $div.show();
    if(isNovus && !isOrdinaryPart) {
      var optionID = novusOption[partType]||0;
      var year = $('#selYearNovus').val();
      id = selPO[partType];
      if(id && id[year]) id = id[year];
      if(id && id.length > 1) {
        var $options = $('.novus-options.'+part);
        var $select = $options.find('select');
        var options = '';
        for(var i in id) {
          var o = id[i];
          options += '<option value="' + i + '">' + o.incipit + '</option>';
        }
        $select.empty().append(options);
        $select.val(optionID);
        optionID = $select.prop('selectedIndex');
        $options.show();
      } else {
        optionID = 0;
      }
      id = id && id[optionID];
      incipit = id && id.incipit;
      id = id && id.id;
    } else {
      id = selPO[partType+(partIndex||'')+'ID'];
      if(partIndex && (id == undefined)) id = selPO[partType+'ID'];
      if(id == 'no') id = '';
      if(id && id.constructor == [].constructor) {
        id = id[partIndex];
        partIndex++;  // for human readable 1-based index.
      }
      var match = /^litany\/([\w-_ ]+)/.exec(id);
      if(match) {
        id = litanyMap[match[1]].map(function(l){return 'litanies/'+l});
        if($extraChantsPlaceholder.length) {
          $extraChantsPlaceholder.empty();
        } else {
          $extraChantsPlaceholder = $('<div>').addClass('extra-chants').insertAfter($div);
        }
      }
    }
    var $includePart = $('#include'+capPart);
    $('#lbl'+capPart).find('a').attr('href',(id && typeof(id)!='object')? gregobaseUrlPrefix+id : null);
    $div.toggleClass('showing-chant', !!(id && id != 'no'));
    if(id || (selDay=='custom' && !isOrdinaryPart)) {
      $includePart.parent('li').removeClass('disabled');
      var $txt = $('#txt'+capPart);
      $div.show();
      var $sel = $('#sel'+capPart);
      var selValue = $sel.val();
      sel[part].overrideTone = sel[part].overrideToneEnding = null;
      var updateGabc = function(gabc){
        var header = getHeader(gabc);
        gabc = gabc.slice(header.original.length);
        var refrainMatch = /((\([cf]b?[1-4]\)|<sp>R\/<\/sp>\.)\s*([b-df-hj-np-tv-xz,;]*)[aeiouyáéíóúäëïöü]([b-df-hj-np-tv-xz,;]*)\(([a-m])[^)]*\)\s*([b-df-hj-np-tv-xz,;]*)[aeiouyáéíóúäëïöü]([b-df-hj-np-tv-xz,;]*)\(([a-m])[^)]*\)[^^]*?\(:+\)[^^]*?\([^)]*z\))[^^]*?\(:+\)(?:[^(]+(?:\(\)|\s+))*\s*(\3[aeiouyáéíóúäëïöü]\4(?:\(\5[^)]*\)|)\s*\6[aeiouyáéíóúäëïöü]\7(?:\(\8[^)]*\)|)\s*(?:[a-zaeiouyáéíóúäëïöü,;.?:\s]+(?:\([^)]*\))?){0,3})\s*\(:*(?:\)\s*\()?z\)[^^]*?\(:+\)(?:[^(]+(?:\(\)|\s+))*\s*(\3[aeiouyáéíóúäëïöü]\4(?:\(\5[^)]*\)|)\s*\6[aeiouyáéíóúäëïöü]\7(?:\(\8[^)]*\)|)\s*(?:[a-zaeiouyáéíóúäëïöü,;.?:\s]+(?:\([^)]*\))?){0,3})\s*\(:*(?:\)\s*\()?z\)/i.exec(gabc);
        if(refrainMatch) {
          reReplace = new RegExp('(' + refrainMatch[9].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*)(\\(:+(?:\\)\\s*\\()?|\\((?=[zZ]))?([zZ]\\))?\\)?', 'g');
          var numParts = refrainMatch[2] === '<sp>R/</sp>.'? 3 : 2;
          var clef = numParts === 2? refrainMatch[2] : gabc.match(/\([cf]b?[1-4]\)/)[0];
          var index = refrainMatch.index + refrainMatch[1].length;
          var runReplaces = function(gabc) {
            gabc = gabc.replace(reReplace, function(match,mainPart,doubleBar,hasZ) {
              return match.replace(/\([^)]+\)/g,'').trim().replace(/(?!\(\)$)..$/g,'$&()') + ' ' + (hasZ? '(Z)' : '');
            });
            return runGabcReplaces(gabc, header);
          }
          var mockHeader = "initial-style: 0;\n%%\n" + clef + ' ';
          var firstPart = runReplaces(gabc.slice(numParts === 3? refrainMatch.index : 0,index));
          var secondPart = runReplaces(gabc.slice(index));
          var prePart = numParts === 3 && (header + runReplaces(gabc.slice(0, refrainMatch.index)));
          sel[part].effectiveGabc = (prePart || header) + firstPart + secondPart;
          firstPart = (numParts === 3? mockHeader : header) + firstPart;
          secondPart = mockHeader + secondPart;
          gabc = [
            {
              sticky: 0,
              gabc: firstPart
            }, {
              sticky: 1,
              gabc: secondPart
            }
          ];
          if(prePart) {
            gabc.unshift({
              gabc: prePart
            });
          }
          $extraChantsPlaceholder.remove();
          $extraChantsPlaceholder = $('<div>').addClass('extra-chants').insertAfter($div);
          renderExtraChants($extraChantsPlaceholder, gabc, '-'+part);
          $div.find('.chant-preview').empty();
          gabc = '';
        }
        if(selValue != $sel.val()) return;
        var replaces = selPO[part + 'Replace'];
        if(replaces) {
          gabc = header + gabc;
          var i = 0;
          while(i < replaces.length) {
            gabc = gabc.replace(replaces[i++],replaces[i++]);
          }
          header = getHeader(gabc);
          gabc = gabc.slice(header.original.length);
        }
        gabc = runGabcReplaces(gabc, header);
        if(isNovus && part == 'kyrie') {
          gabc = gabc.replace(/(\)[^(]*)ii[ij]\.?/gi,'$1bis.').replace(/(\)[^(]*?)(<i>)?i[ij]\.?(<\/i>)?/gi,'$1')
        }
    
        //if(gabcStar) gabc = gabc.replace(/\*/g,gabcStar);
        var text,
            truePart = partType;
        if(!isOrdinaryPart) {
          var gabcWithoutNA = removeNotApplicableFromGabc(gabc);
          var plaintext = decompile(gabcWithoutNA,true,sel[part]);
          if((sel[part].isAlleluia = isAlleluia(part,plaintext))) {
            truePart = 'alleluia';
            if(isNovus) {
              // in novus ordo, neither ij. nor asterisks are marked.
              // remove ij. if present
              gabc = gabc.replace(/(al\([^)]+\)le\([^)]+\)l[uú]\([^)]+\)[ij]a[.,;:](?:\s+\*)?\([^)]+\)\W+)(?:<i>)?ij\.?(?:<\/i>)?([^\)]*\()/i,'$1$2').
                replace(/\*(\(\))?/g,''); // remove asterisks
            } else {
              var gradualeIsFirstAlleluia = isAlleluia('graduale',(sel.graduale.lines||[[]])[0][0]) && !/non\srep[eé]titur/i.exec((sel.graduale.lines||[[]])[0][1]);
              if(part=='graduale' || (part=='alleluia' && !gradualeIsFirstAlleluia)) {
                // add ij. if not present:
                gabc = gabc.replace(/(al\([^)]+\)le\([^)]+\)l[uú]\([^)]+\)[ij]a[.,;:](?:\s+\*|\([^)]+\)\W+\*))(?!(\([^)]+\)\s*)*\s*(?:\([;:,]+\))?\s*[{}]*(<i>)?{?ij\.?[{}]*(<\/i>)?}?)(?!(?:\([,;:]\)|\s+|<i>|[{}(_^]+)*non\s+rep[eé]titur)/i,'$1 <i>ij.</i>');
              } else if((part=='alleluia' && gradualeIsFirstAlleluia) || /^graduale[1-9]/.test(part)) {
                // remove ij. if present
                gabc = gabc.replace(/(al\([^)]+\)le\([^)]+\)l[uú]\([^)]+\)[ij]a[.,;:](?:\s+\*)?\([^)]+\)\W+)(?:<i>)?ij\.?(?:<\/i>)?([^\)]*\()/i,'$1$2');
              }
            }
            plaintext = decompile(gabc,true,sel[part]);
          }
          var lines = sel[part].lines = plaintext.split(/\n/).map(function(line) {
            return reduceStringArrayBy(line.split(reFullOrHalfBarsOrFullStops),3);
          });
          if(!sel[part].pattern) {
            sel[part].pattern = deducePattern(plaintext, lines, !truePart.match(/alleluia|graduale|tractus/));
          }
          text = sel[part].text = versifyByPattern(lines, sel[part].pattern);
        }
        if(/^(graduale|tractus)/.test(part)) {
          var $style = $('#selStyle'+capPart),
              styleVal = $style.val();
          $style.empty();
          if(truePart == 'alleluia') {
            $style.append($alleluiaOptions.clone());
          } else {
            $style.append($gradualeOptions.clone());
            var temp = (header['office-part']||'').toLowerCase();
            if(temp === 'alleluia' && truePart != 'alleluia') temp = 'verse';
            if(temp in partAbbrev) {
              truePart = temp;
              if(truePart != 'graduale') partIndex = null;
            }
            // if it's a gradual or tract, we'll handle it below, as we add the extra option.
            if(!/^(graduale|tractus)/.test(truePart) && /^psalm-tone/.test(styleVal)) {
              styleVal = 'psalm-tone';
            }
          }
          $style.val(styleVal);
        } else if(part == 'asperges') {
          truePart = decompile(removeDiacritics(gabc),true).match(/\w+\s+\w+/)[0];
        } else if(partType == 'custom') {
          truePart = ordinaryName || header.name || 'Ad libitum';
          partIndex = null;
        }
        if(/^(graduale|tractus)/.test(truePart)) {
          $style.append($('<option>').attr('value','psalm-tone1').text('Psalm Toned Verse' + (truePart == 'tractus'? 's':'')));
          styleVal = $style.val();
          if(/^psalm-tone[^1]/.test(styleVal)) {
            styleVal = 'psalm-tone';
          }
          $style.val(styleVal);
        }
        var capTruePart = truePart.replace(/(^|\s)([a-z])/g, function(all,space,letter) {
          return space + letter.toUpperCase();
        });
        if(capTruePart) {
          $('#lbl'+capPart+'>a,#include'+capPart+'>span.lbl').text(capTruePart + (partIndex? ' '+partIndex : ''));
          $('#selStyle'+capPart+' option[value=full]').text('Full ' + capTruePart);
        }
        var romanMode = romanNumeral[header.mode];
        var annotation = partAbbrev[truePart] || partAbbrev[(header.officePart||'').toLowerCase()];
        if(annotation) {
          header.annotation = (partIndex? partIndex + '. ' : '') + annotation;
          header.annotationArray = [header.annotation, romanMode];
        } else {
          header.annotation = romanMode;
        }
        gabc = gabc? (header + gabc) : '';
        sel[part].gabc = gabc;
        sel[part].mode = sel[part].originalMode = header.mode;
        if(part==='asperges' && gabc.match(/\(::\)/g).length === 1) {
          sel[part].gabc = gabc = getAspergesVerseAndGloriaPatriGabc(sel[part]);
        }
        if(part.match(/^(asperges|introitus)$/) && selPropers && selPropers.gloriaPatri === false) {
          sel[part].gabc = gabc = removeGloriaPatriGabc(sel[part]);
        }
        var $selTone = $('#selTone' + capPart).val(sel[part].overrideTone || header.mode);
        $('#selStyle' + capPart).change();
        if(!$selTone.length) {
          sel[part].style = 'full';
          updateTextAndChantForPart(part);
        } else if(sel[part].overrideToneEnding) {
          var $selToneEnding = $('#selToneEnding' + capPart).val(sel[part].overrideToneEnding).change();
        }
        var $toggleEditMarkings = $div.find('.toggleEditMarkings');
        if($toggleEditMarkings.find('.showHide').hasClass('showing')) {
          toggleEditMarkings.call($toggleEditMarkings[0],true);
        }
        if(!(sel[part].style||'').match(/^psalm-tone/)) $toggleEditMarkings.hide();
      };
      if(id) {
        if(typeof(id) == 'object') {
          renderExtraChants($extraChantsPlaceholder, id, '-'+part);
          updateGabc('');
          $div.find('.chant-preview').empty();
        } else {
          $extraChantsPlaceholder.remove();
          $.get('gabc/'+id+'.gabc',updateGabc);
        }
      } else {
        $extraChantsPlaceholder.remove();
        updateGabc('');
      }
    } else {
      if(isOrdinaryPart) {
        $extraChantsPlaceholder.remove();
        $div.find('.chant-preview').empty();
        if(partType == 'custom') {
          $('#lbl'+capPart+'>a,#include'+capPart+'>span.lbl').text('Ad libitum');
        }
      } else {
        $div.hide();
      }
      $includePart.parent('li').addClass('disabled');
    }
  }
  var removeMultipleGraduales = function() {
    var i = 1;
    var $multipleGraduales = $('.multiple-graduales-'+i);
    while($multipleGraduales.length) {
      $multipleGraduales.remove();
      delete sel['graduale'+i];
      ++i;
      $multipleGraduales = $('.multiple-graduales-'+i);
    }
  };
  var setGradualeId = function(id) {
    var appendId = function(i,val) {
      if(!val) return val;
      if(val.slice(-8).toLowerCase()=='graduale') return val + id;
      return val.replace(/graduale\b/,'graduale'+id);
    }
    return function() {
      $(this).children().each(setGradualeId(id)).attr('id', appendId).attr('for', appendId);
      for(var i=0; i < this.attributes.length; ++i) {
        if(this.attributes[i].name != 'placeholder') this.attributes[i].value = this.attributes[i].value.replace(/(graduale)(?!\d|s)/gi,'$1'+id);
      }
    }
  };
  var gradualeTemplate = '\
  <li class="disabled multiple-graduales-$num"><a href="#" id="includeGraduale$num"><span class="glyphicon glyphicon-check"></span> <span class="lbl">Graduale</span><span class="pull-right toggle-page-break glyphicon glyphicon-file"></span></a></li>\
<div id="divGraduale$num" part="graduale$num" class="multiple-graduales-$num">\
  <div class="block hide-print">\
    <label class="hide-ss" id="lblGraduale$num" for="txtGraduale$num"><a target="_blank">Graduale</a></label>\
    <a class="toggleShowGabc hide-ss" href>(<span class="showHide">Show</span> Text Editor)</a>\
    <div class="flex right">\
      <span class="child-other">\
        <button class="btn btn-xs btn-default remove-modifications">Remove Modifications</button>\
        <label class="sel-label">Mode\
        <select id="selToneGraduale$num" class="sel-style tones" disabled="disabled"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select></label>\
        <select id="selToneEndingGraduale$num" class="sel-style endings graduale$num" style="display: none;"></select>\
        <input id="cbSolemnGraduale$num" type="checkbox" class="cbSolemn graduale$num" title="Check this box to use the solemn psalm tone." style="display: none;">\
      </span>\
      <span class="child-main">\
        <select id="selStyleGraduale$num" class="sel-style">\
          <option value="full">Full Gradual</option>\
          <option value="psalm-tone">Psalm Toned</option>\
        </select>\
      </span>\
    </div>\
    <textarea id="txtGraduale$num" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>\
  </div>\
  <div class="block right">\
    <div class="chant-parent">\
      <div id="graduale$num-preview-container" class="preview-container">\
        <div id="graduale$num-preview" class="chant-preview"></div>\
      </div>\
    </div>\
  </div>\
</div>'
  var addMultipleGraduales = function(count, startIndex) {
    var i = startIndex || 1;
    count += i - 1;
    var $lastGraduale = $('.multiple-graduales-0');
    while(i <= count) {
      var $newGraduale = $(gradualeTemplate.replace(/\$num\b/g,i));
      sel['graduale'+i] = {};
      makeChantContextForSel(sel['graduale'+i]);
      $newGraduale.find('select[id^=selStyle]').change(selStyleChanged);
      $newGraduale.find('select.endings').change(selEndingsChanged);
      $newGraduale.find('input.cbSolemn').change(cbSolemnChanged);
      $newGraduale.find('select.tones').change(selTonesChanged);
      $newGraduale.find('textarea[id^=txt]').autosize().keydown(internationalTextBoxKeyDown).keydown(gabcEditorKeyDown).keyup(editorKeyUp);
      
      $lastGraduale.each(function(i){
        $(this).after($newGraduale[i]);
      });
      $newGraduale.find('.sel-style').change();
      $lastGraduale = $newGraduale;
      ++i;
    }
    includePropers = [];
    $('a[id^=include]').each(function(){
      includePropers.push(this.id.slice(7).toLowerCase());
    });
    return $newGraduale;
  }
  var updateDay = function() {
    var ref = proprium[selDay] && proprium[selDay].ref || selDay;
    selPropers = proprium[selDay + selTempus] || proprium[ref + selTempus] || proprium[ref];
    if(selPropers && selPropers.ref) selPropers = proprium[selPropers.ref];
    if(selPropers && /^(?:Adv|Quad|[765]a)/.test(selDay) && !('gloria' in selPropers)) {
      selPropers.gloria = false;
    }
    $("#extra-chants").empty();
    sel.extraChants = extraChants[selDay];
    if(sel.extraChants && (!selPropers || selPropers.extraChants !== true)) {
      $("#divExtraChants").show();
      showHideExtraChants(false);
    } else {
      $("#divExtraChants").hide();
    }

    $('.ordinary').toggle(!selPropers || (selPropers.ordinary !== false));
    if(selPropers || selDay=='custom') {
      removeMultipleGraduales();
      // remove temporary rubrics
      $('.rubric.temporary').remove();
      if(selPropers) {
        if(selPropers.gradualeID && selPropers.gradualeID.constructor === [].constructor) {
          addMultipleGraduales(selPropers.gradualeID.length - 1);
        }
        if(selPropers.rubrics) addTemporaryRubrics(selPropers.rubrics);
      } else {
        selPropers = {};
      }
      updateAllParts();
    }
  }
  var updateDayNovus = function() {
    selPropers = propriumNoviOrdinis[selDay + selTempus] || propriumNoviOrdinis[selDay];
    if(selPropers) {
      selPropers.isNovus = true;
      novusOption = {};
      updateAllParts();
    }
  }
  var addTemporaryRubrics = function(rubrics) {
    Object.keys(rubrics).forEach(function(key) {
      var rubric = makeRubric(rubrics[key],'temporary'),
          match = /^(before|after)/.exec(key),
      selector = key.slice(match[0].length),
      fn = 'insert' + match[0][0].toUpperCase() + match[0].slice(1);
      rubric[fn](selector);
    });
  }
  var updateAllParts = function(justPropers) {
    $('.novus-options').hide();
    $('div[part]:not(.ordinary):not([custom-chant])').each(function(){
      updatePart($(this).attr('part'));
    });
    var gloriaComesBefore = selPropers && /^before(#.*)/.exec(selPropers.gloria);
    gloriaComesBefore = gloriaComesBefore? gloriaComesBefore[1] : '#divGraduale';
    $('#divGloria').insertBefore(gloriaComesBefore);
    var $extraChants = $('#mandatory-extra-chants').empty();
    $('.mandatory-extra-chant').remove();
    if(selPropers && selPropers.extraChants === true && sel.extraChants) {
      if(sel.extraChants.constructor === Array) {
        renderExtraChants($extraChants, sel.extraChants);
      } else {
        var i = 0;
        $.each(sel.extraChants, function(part, extraChants) {
          var $part = $('[part="'+part+'"]');
          if($part.length == 0) {
            console.warn('Part not found:', part, 'placing extra chants at end of page');
            $part = $(document.body).children().last();
          } else if(!(part + 'ID' in selPropers) && ordinaryParts.indexOf(part) < 0) {
            $part.hide();
          }
          var $extraChants = $('<div>').addClass('mandatory-extra-chant').insertAfter($part);
          i = renderExtraChants($extraChants, extraChants, i);
        });
        $('div[part^=graduale]').each(function(){
          updatePart($(this).attr('part'));
        })
      }
    }
  };
  var selectedDayNovus = function(e){
    selDay = $(this).val();
    if(!isNovus) {
      isNovus = true;
      $('#selSunday,#selSaint,#selMass,#selTempus').hide();
      $('#selSundayNovus,#selYearNovus').show();
      $('#btnCalendar').text('Novus Ordo');
    }
    clearHash({ sundayNovus: selDay }, selDay);
    updateDayNovus();
  };
  var getSeasonForMoment = function(m) {
    var dates = Dates(m.year());
    if(m.isSameOrAfter(dates.septuagesima) && m.isBefore(dates.pascha)) {
      return 'Quad';
    } else if(m.isSameOrAfter(dates.pascha) && m.isBefore(dates.pentecost)) {
      return 'Pasch';
    }
    return '';
  }
  var showHideExtraChants = function(e) {
    e && e.preventDefault && e.preventDefault();
    var $this = $('#divExtraChants a.showHide'),
        $showHide = $this.find('span.showHide'),
        $container = $('#extra-chants'),
        showHide = typeof(e)=='boolean'? e : $showHide.text() === 'Show';
    $showHide.text(showHide? 'Hide' : 'Show');
    $container.toggle(showHide);
    if(showHide && $container.is(':empty')) {
      // set up the chants for first time rendering:
      renderExtraChants($container, sel.extraChants);
    }
  }
  function makeRubric(rubric,extraClass) {
    var classes = 'rubric ' + (extraClass || '');
    if(typeof(rubric) == 'string') rubric = [rubric];
    return rubric.reduce(function(jq,rubric) { return (jq.add($('<div>').addClass(classes).html(
          rubric.replace(/>/g,'</span>').
            replace(/<(?!\/?\w+>)/g,'<span class="quote">').
            replace(/([vr])\/./g,"<span class='versiculum'>$1</span>").
            replace(/[\[\]{}()]/g,"<span class='bracket'>$&</span>")))) }, $());
  }
  // addI is how much to add to i based on other already rendered extra chants, so that each has a unique number
  function renderExtraChants($container, extraChants, addI) {
    var $stickyParent, $curContainer = $container;
    if(!addI) addI = 0;
    
    extraChants.forEach(function(chant, i) {
      if(typeof chant == 'string') {
        var match = /^(.+)\.(gabc|html)$/.exec(chant);
        chant = {};
        if(match[2]=='gabc') {
          chant.id = match[1];
        } else if(match[2]=='html') {
          chant.url = match[0];
        }
      }
      if(chant.title) {
        $curContainer.append($('<div>').addClass('chant-title').html(chant.title.replace(/</g,'<span class="rubric">').replace(/>/g,'</span>')));
      }
      if(chant.rubric) {
        $curContainer.append(makeRubric(chant.rubric));
      }
      if(chant.id && chant.psalmtone) {
        if(!selPropers.gradualeID) selPropers.gradualeID = [0];
        addMultipleGraduales(1,selPropers.gradualeID.length);
        $curContainer.append($('div.multiple-graduales-'+selPropers.gradualeID.length).show())
        selPropers.gradualeID.push(chant.id);
      } else if(chant.gabc || chant.id) {
        if(chant.sticky === 0) {
          $curContainer = $stickyParent = $('<div>').appendTo($container);
        }
        var part = 'extra-' + (i + addI);
        var options = (typeof chant.id == 'object')? chant.id : null;
        sel[part] = {
          gabc: chant.gabc,
          activeGabc: chant.gabc,
          id: chant.id,
          style: 'full',
          noDropCap: !!chant.gabc || (typeof(chant.id)=='string' && chant.id.match(/-/)),
          sticky: chant.sticky === 0
        };
        var $curElement;
        $curElement = $('<div>').attr('part',part).addClass('full showing-chant').
          append("<div class='block hide-print'>\
  <!-- <label class='hide-ss' id='lbl"+part+"' for='txt"+part+"'><a target='_blank' class='office-part-name'>Chant</a></label>\
  <a class='toggleShowGabc hide-ss'>(<span class='showHide'>Show</span> Text Editor)</a>\
  -->\
  <div class='flex right'>\
    <span class='child-other'>\
      <button class='btn btn-xs btn-default remove-modifications'>Remove Modifications</button>\
      <!-- <label for='selTone"+part+"' class='sel-label'>Mode</label>\
          <select id='selTone"+part+"' class='sel-style tones'></select>\
          <select id='selToneEnding"+part+"' class='sel-style endings "+part+"'></select>\
          <input id='cbSolemn"+part+"' type='checkbox' class='cbSolemn "+part+"' title='Check this box to use the solemn psalm tone.'>\
      -->\
    </span>\
    <!-- <span class='child-main'>\
          <select id='selStyle"+part+"' class='sel-style'><option value='full'>Full Tone</option><option value='psalm-tone'>Psalm Toned</option></select>\
        </span>\
    -->\
  </div>\
  <textarea id='txt"+part+"' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false'></textarea>\
</div>\
<div class='block right'>\
  <div class='chant-parent'>\
    <div id='"+part+"-preview-container' class='preview-container'>\
      <div id='"+part+"-preview' class='chant-preview'></div>\
    </div>\
  </div>\
</div>");

        makeChantContextForSel(sel[part]);
        var downloadThisChant = function() {
          if(sel[part].id) {
            $.get('gabc/'+sel[part].id+'.gabc',function(gabc) {
              if(chant.gabcReplace) {
                for (var i=0; i < chant.gabcReplace.length; i += 2)
                  gabc = gabc.replace(chant.gabcReplace[i], chant.gabcReplace[i + 1]);
              }
              var header = getHeader(gabc);
              gabc = gabc.slice(header.original.length);
              gabc = header + runGabcReplaces(gabc, header);
              if(header.officePart) {
                $curElement.find('.office-part-name').text(header.officePart);
              }
              sel[part].gabc = sel[part].activeGabc = gabc;
              updateExsurge(part, sel[part].id);
            });
          }
        };
        if(options) {
          // in case it's sticky, we want the option to be sticky too:
          $curElement = $('<div>').append($curElement);
          var optionID = 0;
          var optionKeys = Object.keys(options);
          sel[part].id = null;
          var nextOptionID = 0;
          var $option = $('<div class="link rubric after">Click here for alternative <span class="quote"></span> option.</div>').click(function(){
            optionID = nextOptionID;
            nextOptionID = (optionID + 1) % optionKeys.length;
            $(this).find('.quote').text(optionKeys[nextOptionID]);
            sel[part].id = options[optionKeys[optionID]];
            sel[part].annotationArray = ['Ant.',optionKeys[optionID]];
            downloadThisChant();
          }).appendTo($curElement).click();
        }
        if(chant.sticky === 0) {
          $curElement.addClass('sticky');
        }
        $curContainer.append($curElement);

        downloadThisChant();
        if(chant.gabc) {
          updateExsurge(part);
        }
      }
      if(chant.rubricAfter) {
        $curContainer.append(makeRubric(chant.rubricAfter,'after'));
      }
      if(chant.html || chant.url) {
        var $div = $('<div>');
        $curContainer.append($div);
        setHtml = function(html) {
          $div.html(html
            .replace(/[†*]/g,'<span class="red">$&</span>')
            .replace(/<\/\w+><\w+>|[a-z]<\w+>|<\/\w+>(?=[a-z])/gi,'$&&shy;') // add hyphenation points at marks between bold/italic syllables
            .replace(/(\s|<\/?\w+>)([a-zœæǽáéíóúýäëïöüÿāēīōūȳăĕĭŏŭ]{3,})(?=\s|&nbsp;|[,.;:?!]|<\/?\w+>)/gi,function(all,preword,word){
              if(Hypher && Hypher.languages && Hypher.languages.la) return preword + Hypher.languages.la.hyphenateText(word);
              return all;
            })
          );
        };
        if(chant.html) {
          setHtml(chant.html)
        } else {
          $.get('gabc/'+chant.url,setHtml);
        }
      }
      if(chant.sticky === 1) {
        $curContainer = $container;
      }
    });
    return extraChants.length + addI;
  }

  var updateTempus = function() {
    $('[tempus]').each(function() {
      var $this = $(this),
          tempus = $this.attr('tempus'),
          negated = tempus[0] === '-';
      if(negated) tempus = tempus.slice(1);
      var match = tempus.toLowerCase() == selTempus.toLowerCase();
      $this.toggle(match? !negated : negated);
    });
  }
  var selectedDay = function(e){
    selDay = $(this).val();
    var hash = {
      sundayNovus: false
    };
    hash[this.id] = selDay;
    var self = this;
    $('#selSunday,#selSaint,#selMass').each(function(){
      if(this != self) {
        this.selectedIndex = 0;
        hash[this.id] = false;
      }
    });
    clearHash(hash, selDay);
    var m = moment(selDay,'MMMD');
    if(m.isValid()) {
      m = getSpecialDateForFeast(m);
      if(m.isBefore(moment().startOf('day').add(-2,'week'))) m.add(1, 'year');
    } else {
      m = dateForSundayKey(selDay);
    }
    selTempus = getSeasonForMoment(m);
    updateTempus();
    var ref = proprium[selDay] && proprium[selDay].ref || selDay;
    if(selDay == "custom" || (ref + 'Pasch') in proprium || (ref + 'Quad') in proprium || (selDay + 'Pasch') in proprium || (selDay + 'Quad') in proprium) {
      $selTempus.show();
      $selTempus.val(selTempus);
    } else {
      $selTempus.prop('selectedIndex',0).hide();
      addToHash('tempus', false, true);
    }
    if(selDay=='custom') {
      $('.sel-custom').show();
    } else {
      $('.sel-custom').hide();
    }
    updateDay();
  };
  var selectedTempus = function(e){
    selTempus = $(this).val();
    updateTempus();
    addToHash('tempus', selTempus);
    updateDay();
  };
  var ordinaryParts = ['asperges','kyrie','gloria','credo','preface','sanctus','agnus','ite'];
  var selectedOrdinary = function(e){
    selOrdinary = $(this).val();
    addToHash('ordinary', selOrdinary);
    massName = $(this.options[this.selectedIndex]).text();
    massName = massName.slice(0, massName.indexOf(' -'));
    var ordinary = massOrdinary[selOrdinary - 1] || {};
    ordinaryParts.forEach(function(part){
      var capPart = part[0].toUpperCase() + part.slice(1),
          $part = $('[part=' + part + ']'),
          $select = $part.find('select'),
          selectVal = $select.val(),
          selectedPart = ordinary[part] || [],
          adLibPart = ordinaryAdLib[part] || [],
          optionNone = $('<option></option>').val('no').text('No ' + capPart);
      if(selectedPart.constructor != [].constructor) {
        selectedPart = [selectedPart];
      }
      if(adLibPart.constructor != [].constructor) {
        adLibPart = [adLibPart];
      }
      if(part == 'ite') {
        if(ordinary.benedicamus) selectedPart = selectedPart.concat(ordinary.benedicamus);
        adLibPart = adLibPart.concat(ordinaryAdLib.benedicamus);
      }
      if(selectedPart.length == 0) optionNone.attr('default', true).attr('selected', true);
      $select.empty().append(optionNone);
      var options = [];
      options.push(selectedPart);
      var temp = selectedPart.reduce(function(result,part){
        result[part.id] = part;
        return result;
      }, {});
      options.push(adLibPart.filter(function(part){
        if(!(part.id in temp)) return true;
      }));
      temp = adLibPart.reduce(function(result,part){
        result[part.id] = part;
        return result;
      }, temp);
      options.push(massOrdinary.reduce(function(result,mass){
        var parts = [part];
        if(part == 'ite') parts.push('benedicamus');
        for(var i = 0; i < parts.length; ++i) {
          var p = mass[parts[i]];
          if(!p) continue;
          if(p.constructor != [].constructor) p = [p];
          p.forEach(function(one){
            if(!(one.id in temp)) {
              result.push(one);
              temp[one.id] = one;
            }
          });
        }
        return result;
      }, []));
      var labelArray = [massName, 'Ad Libitum', 'Masses'];
      if(selectedPart.length == 0) {
        // move the Masses ahead of the ad libitum parts:
        options.splice(1,0,options.pop());
        labelArray.splice(1,0,labelArray.pop());
      } else {
        labelArray[2] = 'Other Masses';
      }
      options.forEach(function(optGroup, index){
        if(optGroup.length == 0) return;
        var $optGroup = $('<optgroup></optgroup>');
        var label = labelArray[index];
        $optGroup.attr('label', label);
        optGroup.forEach(function(option, optIndex){
          var $option = $('<option></option>').
            text(option.name || '').
            val(option.id).
            appendTo($optGroup);
          if(index == 0 && optIndex == 0) {
            $option.attr('default', true).attr('selected', true);
          }
        });
        $optGroup.appendTo($select);
      });
      if(part == 'asperges' || part == 'preface' || part == 'credo') {
        $select.val(selectVal);
      }
      if(selPropers) {
        for(var i=0; i<selectedPart.length; ++i) {
          var p = selectedPart[i];
          if(p.feast && p.feast.test(selDay)) {
            $select.val(p.id);
            break;
          }
        }
      }
      $select.change();
    });
  };
  
  function Dictionary(original) {
    this.original = original;
    this.wordMap = [];
  }
  Dictionary.prototype.push = function(index) {
    this.wordMap.push(index);
  }
  Dictionary.prototype.slice = function(start, end) {
    return this.original.slice(this.wordMap[start], this.wordMap[end]);
  }
  
  var decompile = function(mixed,ignoreSyllablesOnDivisiones,storeMap) {
    regexOuter.exec('');
    var header = getHeader(mixed);
    mixed = mixed.slice(header.original.length).replace(/<sp>[vra]\/<\/sp>\s*/gi,'');
    var dictionary = new Dictionary(mixed);
    if(storeMap) storeMap.originalWords = dictionary;
    var curClef;
    var regRep=/^[cf]b?[1-4]\s*|(\s+)[`,;:]+\s*/gi;
    var text='';
    var gabc='';
    var ws;
    var tws='';
    var verses=[];
    var hasElisions=false;
    var lastVerseI=0;
    var lastClef='';
    var verseHasClef=false;
    var lastVerse=function(){return verses[verses.length-1]||null;}
    var match=regexOuter.exec(mixed);
    var verseReps=0;
    var newWord = true;
    var gabcAfterAsterisks = {};
    var justAppliedAsteriskCallback = false;
    while(match) {
      if(storeMap && newWord && match[rog.syl] && match[rog.syl].match(/[a-zœæǽáéíóúýäëïöüÿāēīōūȳăĕĭŏŭ]/i)) {
        dictionary.wordMap.push(match.index);
        newWord = false
      }
      ws=match[rog.whitespace]||'';
      newWord = newWord || !!ws;
      var m=undefined;
      var syl=match[rog.syl];
      if(gabc.length==0) {
        regexGabc.exec('');
        m=regexGabc.exec(match[rog.gabc]);
        if(m && m[4]) {
          lastClef=m[4];
          if(gabc.length==0)verseHasClef=true;
        }
      }
      if(tws==' '&&!syl) {
        regexGabc.exec('');
        m=regexGabc.exec(match[rog.gabc]);
        if(!m||m[4])text += tws;
      } else {
        text += tws;
      }
      if(justAppliedAsteriskCallback) {
        justAppliedAsteriskCallback = false;
      } else if(syl === '*' || syl === '+' || syl === sym_flex) {
        // These symbols may indicate returning to an earlier part of the chant, so we must determine if this is the case, and use the entire text if so.
        var slice = mixed.slice(match.index),
            regexSymbol = syl === '*'? /\*/ : /[+†]/,
            indexFirstSymbol = slice.search(regexSymbol),
            indexSymbol = slice.slice(indexFirstSymbol+1).search(regexSymbol),
            indexDoubleBar = slice.slice(indexFirstSymbol+2).indexOf('(::)');
        if(indexDoubleBar >= 0 && (indexSymbol < 0 || indexDoubleBar < (indexFirstSymbol + 1 + indexSymbol))) {
          slice = slice.slice(0, indexFirstSymbol + 2 + indexDoubleBar + 4);
          var firstWord = slice.match(/[*+†](?:\([^)]+\))?\s+([^(]+\([^)]+\)[^(]+.*?\))(?=\s)/);
          if(firstWord) {
            firstWord = firstWord[1].replace(/\s?[,;:.!?]\(/g,'(');
            if(firstWord in gabcAfterAsterisks) {
              // if it's in our dictionary, let's replace it with the whole thing:
              var lastIndex = regexOuter.lastIndex,
                  sliceText = decompile(slice, ignoreSyllablesOnDivisiones),
                  replaceText = decompile(gabcAfterAsterisks[firstWord], ignoreSyllablesOnDivisiones);
              if(sliceText != replaceText) {
                console.info('replacing responsory text: "' + sliceText + '" with "' + replaceText + '"');
                mixed = mixed.slice(0,match.index) + gabcAfterAsterisks[firstWord] + mixed.slice(match.index + slice.length);
                regexOuter.lastIndex = match.index;
                match = regexOuter.exec(mixed);
                justAppliedAsteriskCallback = true;
                continue;
              } else {
                regexOuter.lastIndex = lastIndex;
              }
            } else {
              // otherwise, let's add it to the dictionary:
              gabcAfterAsterisks[firstWord] = slice;
            }
          }
        }
      }
      if(ignoreSyllablesOnDivisiones) {
        // for matching the bars, we have to make sure they are not between square brackets, as in the notation for a brace above the system.
        barMatch = match[rog.gabc].match(/(?:^|])[^[\]:;]*(:+|;)/)
        barMatch = barMatch && barMatch[1];
        if(barMatch=='::') text += '~';
        else if(barMatch==':') text += ' % ';
        else if(barMatch==';') text += ' | ';
      }
      if(syl && (!ignoreSyllablesOnDivisiones || !match[rog.gabc].match(/^(?:(?:[cf]b?[1-4])|[:;,\s])*$/) || syl.match(/<i>(?:Ps\.?|T\.?\s*P\.?\s*|i+j?\.?)<\/i>/))){
        var sylR=syl.replace(/<i>([aeiouy])<\/i>/ig,'($1)');
        hasElisions = hasElisions||(syl!=sylR);
        if(sylR[0]=='e' && text.slice(-1)=='a') {
          sylR = 'ë' + sylR.slice(1);
        }
        text += sylR;
      }
      gabc+=match[rog.gabc] + (ws.replace(/[^\n]*\n[^\n]*/g,'\n')||" ");
      var nextMatch=regexOuter.exec(mixed);
      
      tws=ws;
      match=nextMatch;
    }
    if(tws)text += tws;
    regexGabc.exec('');
    var gs =verses.join('\n--\n');
    gSyl=[];
    var offset = 0;
    $.each(verses,function(i,o){
      gSyl.push(splitGabc(o,offset));
      offset += o.length + 4;
    });

    //gSyl = splitGabc(gs);
    var s = text.replace(/\s+/g,' ').replace(/^\s+|\s+$|[*{}-]/g,'');
    var index=s.indexOf(' ');
    if(index>1) {
      // make the rest of the first word minuscule
      s=s[0] + s.slice(1,index).toLowerCase() + s.slice(index);
    }
    s = s.replace(/\s*~\s*/g,'\n').replace(/%/g,'*').replace(/\s*\|\s*\n/g,'\n').replace(/(\|\s*)*(\*\s*)+(\|\s*)*/g,'* ').replace(/(\| *)+/g,'| ').replace(/\s*[*|]?\s*$/,'');
    return s;
  };
  
  var addPatternFromSplitLine = function(pattern, sLine) {
    for(var i = 0; i < sLine.length; ++i) {
      for(var j = sLine[i].split(/ \| /g).length; j > 1; --j) {
        pattern.push('');
      }
      if(i < sLine.length - 1) pattern.push('*');
    }
  }
  var makePattern = function(line) {
    var result = [];
    var sLine = splitLine(reduceStringArrayBy(line.split(reFullBarsOrFullStops),3), 2, ' | ', 20);
    if(sLine.length < 2 || Math.max.apply(null,sLine.mapSyllableCounts()) > 20) {
      sLine = splitLine(reduceStringArrayBy(line.split(reFullOrHalfBarsOrFullStops),3), 2, ' | ', 20);
    }
    addPatternFromSplitLine(result, sLine);
    return result;
  }
  var splitIntoVerses = window.splitIntoVerses = function(line) {
    var fullbars = line.match(reFullBars);
    var numSyllables = line.countSyllables();
    if(numSyllables > 30 && fullbars) {
      var split = line.split(reFullBars);
      var satisfied = false;
      var result;
      for(var count = 2; !satisfied && count < 5; ++count) {
        result = [];
        var test = splitLine(split, count, ' * '),
            sylCounts = test.mapSyllableCounts();
        satisfied = Math.max.apply(null,sylCounts) < 50;
        for(var i=0; satisfied && i < count; ++i) {
          // check whether we can make a satisfactory mediant for each verse:
          var mediantTest = splitLine(test[i].split(reFullOrHalfBars), 2, ' | ', 20);
          sylCounts = mediantTest.mapSyllableCounts();
          satisfied = mediantTest.length >= 2 && Math.max.apply(null,sylCounts) <= 20 && Math.min.apply(null,sylCounts) >= 7;
          if(satisfied) {
            addPatternFromSplitLine(result, mediantTest);
            if(i < count - 1) {
              result.push('℣');
            }
          }
        }
      }
      if(satisfied) return result;
    }
    return makePattern(line);
  }
  var versify = function(line, allowSplitting){
    if(allowSplitting || line.countSyllables() >= 50) return splitIntoVerses(line);
    return makePattern(line);
  }

  function deducePattern(text, lines, allowSplittingLines) {
    return text.split('\n').map(function(text) {
      return versify(text, allowSplittingLines);
    });
  }

  // lines is an array of verses, each verse being an array of segments of the verse, e.g., [["Allelúia"],["Non vos relínquam órphanos:", "vado,", "et vénio ad vos,", "et gaudébit", "cor vestrum."]]
  // pattern is an array of arrays as well, indicating the code to be used for each segment, [[], ["*", "", "", ""]]
  function versifyByPattern(lines, pattern) {
    return lines.reduce(function(result, segments, lineNum) {
      var text = '',
          pat = pattern[lineNum],
          capitalize = true;
      pat = [''].concat(pat);
      segments.forEach(function(seg, segNum) {
        switch(pat && pat[segNum]) {
          case '@':
            if(text) text += '\n';
            text += '@ ';
            break;
          case '*':
          case '†':
            text += ' * ';
            break;
          case '℣':
            text += '\n';
            capitalize = true;
            break;
          default:
            if(text) text += ' ';
            break;
        }
        if(capitalize && seg[0]) {
          text += seg[0].toUpperCase() + seg.slice(1);
          capitalize = false;
        } else {
          text += seg;
        }
      });
      var ending = lineNum == (lines.length - 1)? '' : pat[segments.length] == '*'? ' * ' : '\n';
      return result + text + ending;
    }, '');
  }

  var toggleMediant = function(event) {
    var $this = $(this),
        $part = $this.parents('div[part]'),
        part = $part.attr('part'),
        newLine = $this.attr('new-line'),
        lines = sel[part].lines,
        text = '',
        btnState = $this.attr('state');
    switch(btnState) {
      case 'mediant':
      case 'flex':
        btnState = 'new-verse';
        break;
      case 'new-verse':
        btnState = newLine == '1'? 'mediant' : '';
        break;
      default:
        btnState = 'flex';
        break;
    }
    $this.attr('state',btnState);
    var versePattern = sel[part].pattern = lines.map(function(segments, lineNum) {
      var pattern = [],
          $lastBtn = $();
      segments.forEach(function(seg, segNum) {
        var $btn = $part.find('button[line=' + lineNum + '][seg=' + segNum + ']');
        if($btn.length) {
          btnState = $btn.attr('state');
          pattern.push(btnState.replace(/flex|mediant/,'*').replace('new-verse','℣'))
          if(btnState.match(/flex|mediant/)) {
            if($lastBtn.attr('state') == 'mediant') $lastBtn.attr('state','flex');
            $btn.attr('state','mediant');
            $lastBtn = $btn;
          } else if(btnState == 'new-verse') {
            $lastBtn = $();
          }
        }
      });
      var $btn = $part.find('button[line=' + lineNum + '][seg=' + segments.length + ']');
      if($btn.length && $btn.attr('state') == 'mediant') {
        pattern.push('*');
      }
      return pattern;
    });
    sel[part].text = versifyByPattern(lines, versePattern);
    updateTextAndChantForPart(part, true);
    addToHash(part + 'Pattern', versePattern.map(function(pattern) {
        return pattern.join(',').replace(/,+$/,'').replace(/,{2,}/g, function(match, index) {
          var len = match.length;
          if(index) {
            return ',' + (len - 1) + ',';
          } else {
            return len + ',';
          }
        });
      }).join(';').replace(/℣/g,'V'));
  }
  var tagReplacements = {
    "*": /<v>\\greheightstar<\/v>/g,
    "«": /<v>\$\\guillemotleft\$<\/v>/g,
    "»": /<v>\$\\guillemotright\$<\/v>/g,
    "$1": /<v>([\[\(\)\]])/g,
    "$1": /<v>\\large\{(.*?)}<\/v>/g,

    "℣": /<sp>V\/<\/sp>/g,
    "℟": /<sp>R\/<\/sp>/g,
    "æ": /<sp>ae<\/sp>/g,
    "ǽ": /<sp>'(ae|æ)<\/sp>/g,
    "œ": /<sp>'?(oe|œ)<\/sp>/g,
    "[$1]": /<sp>(.*?)<\/sp>/g,

    "($1) ": /<alt>(.*?)<\/alt>\s*/g
  };
  var replaceGabcTags = function(text) {
    Object.keys(tagReplacements).forEach(function(replace) {
      var find = tagReplacements[replace];
      text = text.replace(find,replace);
    });
    return text;
  }
  var makeButton = function(lineNum, segNum, code, $lastBtn) {
    var $button = $('<button>');
    $button.addClass('toggle-mediant btn btn-xs btn-default');
    $button.attr('line', lineNum).attr('seg', segNum);
    $button.click(toggleMediant);
    $button.attr('state',code);
    return $button;
  }
  var toggleEditMarkings = function(event) {
    event && event.preventDefault && event.preventDefault();
    var $this = $(this),
        $part = $this.parents('div[part]'),
        part = $part.attr('part'),
        $showHide = $this.find('.showHide'),
        showing = $showHide.toggleClass('showing', event).hasClass('showing'),
        $blockRight = $part.find('.block.right'),
        $psalmEditor = $blockRight.find('.psalm-editor');
    $showHide.text(showing? 'Hide' : 'Show');
    if(showing) {
      if($psalmEditor.length) {
        $psalmEditor.show();
      } else {
        $psalmEditor = $('<div class="psalm-editor">');
        var lines = sel[part].lines || [[]];
        var pattern = sel[part].pattern || [];
        lines.forEach(function(segments, lineNum) {
          if(lineNum == 0 && segments.length == 2 && segments[0].match(/^allel[úu][ij]a\.?$/i) && segments[1].match(/<i>i[ij]\.?<\/i>/i)) {
            segments = ['Allelúia * <i>ij.</i>'];
          }
          var $lastBtn = $();
          if(lineNum > 0 && segments.length > 1 && !segments[0].match(/^<i>/)) {
            var segCount = lines[lineNum-1].length;
            var code = (!pattern[lineNum-1] || pattern[lineNum-1][segCount-1] == '*')? 'mediant' : 'new-verse';
            $psalmEditor.append(makeButton(lineNum - 1, segCount, code).attr('new-line','1')).append(' ');
          }
          var pat = pattern[lineNum] || [];
          segments.forEach(function(segment, segNum) {
            var $span = $('<span>'),
                code = (pat[segNum] || '');
            switch(code) {
              case '*':
              case '†':
                code = 'mediant';
                break;
              case '℣':
                code = 'new-verse';
                break;
              default:
                code = '';
                break;
            }
            $span.html(replaceGabcTags(segment).replace(/<([a-z]+)>(.*<\/\1>)|[a-zœæǽáéíóúýäëïöüÿāēīōūȳăĕĭŏŭ]+/gi, function(word,tag,afterOpen) {
              if(tag) {
                if(tag=='i') return '<i class="red">' + afterOpen;
                return word;
              }
              return Hypher.languages.la.hyphenate(word).map(function(syl, i, syls){
                var result = '<syl';
                if(i==0 && syls.length==2 || syl.match(/[áéíóúý]/i)) result += ' accent';
                result += '>';
                if(i) result += '&shy;';
                result += syl + '</syl>';
                return result;
              }).join('');
            }).replace(/\*/,'<span class="red">*</span>'));
            if(/^allel[uú][ij]a\s*(\*|\*?\s*(<i>)?ij\.(<\/i>)?)/i.test(segment)) {
              $span.find('syl[accent]').attr('accent',null);
            } else {
              var syls = $span.find('syl');
              for(var lastAccent=syls.length, i=lastAccent - 1; i >= -1; --i) {
                var $syl = $(syls[i]);
                if($syl.is('[accent]')) {
                  lastAccent = i;
                  continue;
                }
                if(lastAccent - i == 3) {
                  $(syls[ (lastAccent = i+1) ]).attr('accent','');
                }
              }
            }
            $psalmEditor.append($span.contents());
            if(segNum != segments.length - 1) {
              $psalmEditor.append(' ').append($button = makeButton(lineNum, segNum, code)).append(' ');
              if(code == 'mediant') {
                $lastBtn.attr('state','flex');
                $lastBtn = $button;
              } else if(code == 'new-verse') {
                $lastBtn = $();
              }
            }
          });
          if(lineNum != lines.length - 1) {
            $psalmEditor.append('<br>');
          }
        });
        $blockRight.prepend($psalmEditor);
        getPsalmToneForPart(part);
      }
    } else {
      $psalmEditor.hide();
    }
  }

  function resetPartStyle(part) {
    var capPart = part[0].toUpperCase() + part.slice(1),
        $selToneEnding = $('#selToneEnding' + capPart),
        $selTone = $('#selTone' + capPart),
        $cbSolemn = $('#cbSolemn' + capPart),
        $right = $selTone.parent(),
        $toggleEditMarkings = $right.find('.toggleEditMarkings'),
        $part = $('[part='+part+']');
    $part.removeClass('psalm-toned').addClass('full');
    if($toggleEditMarkings.length) toggleEditMarkings.call($toggleEditMarkings[0],false);
    $toggleEditMarkings.hide();
    $selToneEnding.hide();
    $cbSolemn.hide();
    $selTone.attr('disabled',true);
  }
  
  var updateStyle = function(part,style){
    addToHash('style'+part[0].toUpperCase()+part.slice(1), style == 'full' ? '' : style);
    if(style == 'full') {
      addToHash(part+'Pattern','');
    }
    sel[part].style = style;
    var capPart = part[0].toUpperCase() + part.slice(1),
        $selToneEnding = $('#selToneEnding' + capPart),
        $selTone = $('#selTone' + capPart),
        $cbSolemn = $('#cbSolemn' + capPart),
        $right = $selTone.parent(),
        $toggleEditMarkings = $right.find('.toggleEditMarkings'),
        $part = $('[part='+part+']'),
        gabc = sel[part].gabc;
    if(style.match(/^psalm-tone/)) {
      $part.addClass('psalm-toned').removeClass('full');
      if($toggleEditMarkings.length == 0) {
        $toggleEditMarkings = $("<a href='' class='toggleEditMarkings'>(<span class='showHide'>Show</span> Editor)</a>")
        $toggleEditMarkings.click(toggleEditMarkings);
        $right.prepend($toggleEditMarkings);
      } else {
        $toggleEditMarkings.show();
      }
      var gabcHeader = gabc && getHeader(gabc) || {};
      // if it is an alleluia:
      if(part.match(/^(?:graduale|allelu[ij]a)/) && isAlleluia(part,sel[part].text)) {
        if(style=='psalm-tone2') {
          // if it uses the simple psalm tone, then we still want to show the endings and allow peregrinus and alts:
          populateSelectWithTones($selTone,true,gabcHeader.mode || true);
          $selToneEnding.show();
          $cbSolemn.show();
        } else {
          // otherwise, we are using the introit tones, so we don't have endings, alts or peregrinus available:
          populateSelectWithTones($selTone,false,true);
          $selToneEnding.hide();
          $cbSolemn.hide();
        }
        if(style=='psalm-tone1' || !(gabcHeader && gabcHeader.mode)) {
          // for alleluias, we can't allow changing the tone unless it is "fully psalm toned"
          // however, this is complicated a bit if the tone is 4 or 6, which have alternate options available
          $selTone.attr('disabled',false);
        } else {
          if(style=='psalm-tone2' && (gabcHeader.mode == 4 || gabcHeader.mode == 6)) {
            $selTone.attr('disabled',false);
          } else {
            $selTone.attr('disabled',true);
          }
          $selTone.val(sel[part].overrideTone || gabcHeader.mode);
        }
      } else {
        if(part.match(/^graduale/) && gabcHeader.officePart == 'Hymnus') {
          // again, Introit tones
          populateSelectWithTones($selTone,false,true);
          $selToneEnding.hide();
          $cbSolemn.hide();
        } else {
          populateSelectWithTones($selTone,true,true);
          $selToneEnding.show();
          $cbSolemn.show();
        }
        if(gabc) {
          $selTone.val(gabcHeader.mode);
        }
        $selTone.attr('disabled',false);
      }
    } else {
      if(part.match(/^graduale/)) {
        // it may have been an alleluia before, so we have to reset it just in case.
        populateSelectWithTones($selTone,true,true);
      }
      resetPartStyle(part);
      if(gabc) {
        $selTone.val(getHeader(gabc).mode);
      }
    }
    $selTone.change();
  }
  
  var capitalizeForBigInitial = function(text) {
    var result = '';
    m = text.match(regexLatin);
    m = m && m[0].match(/^[a-z]+/i);
    if(m) {
      m = m[0];
      result = m[0].toUpperCase();
      if(m[1]) {
        result += m[1].toUpperCase();
        if(m[2] && m.length==3 && (text[3]==' ' || text[3]==',')) {
          result += m[2].toUpperCase();
        }
      }
    }
    return result + text.slice(result.length);
  }

  var swapDoFaClef = function(gabc, clef) {
    var c1 = parseInt(clef[1]),
        c = c1 * 2 + 1,
        faTi = c + 3 + 7,
        gabcFaTi = "x",
        charCodeForA = 'a'.charCodeAt(0);
    while(faTi >= 0) {
      if(faTi < 13) gabcFaTi += String.fromCharCode(charCodeForA + faTi);
      faTi -= 7;
    }
    var regex = new RegExp("[" + gabcFaTi + "]",'i');
    if(regex.test(gabc)) {
      // the clefs are not equivalent...
      if(clef[0] == 'f') {
        c = c1 - 1.5;
      } else {
        c = c1 + 1.5;
      }
      if(c < 1) c += 3.5;
      if(c >= 4.5) c-= 3.5;
      return clef[0] + c;
    }
    return clef;
  }
  
  var shiftGabcForClefChange = function(gabc,newClef,clef) {
    if(clef.length < 2)return;
    if(newClef[0] != clef[0]) {
      clef = swapDoFaClef(gabc.join(' '), clef);
    }
    var baseClefI = parseInt(newClef[1],10);
    //if(newClef[0]=='f') baseClefI += 2;
    var clefI = parseFloat(clef.slice(1),10);
    //if(clef[0]=='f') clefI += 2;
    var diff = (baseClefI - clefI) * 2;
    // minimize Difference: 
    if(diff < -3.5) diff += 7;
    if(diff > 3.5) diff -= 7;
    return gabc.map(function(gabc) { return shiftGabc(gabc,diff) });
  }
  
  var applyLiquescents = function(gabc){
    return gabc.replace(/[aeiouyáéíóúýæǽœ][mn]\([^)]*([a-m])([a-l])\)(?=\S)/ig,function(m,first,second){
      if(first>second) return m.slice(0,-1) + '~)';
      return m;
    });
  }
  
  // return a psalm tone that begins with the incipit of the termination but ends with the mediant.
  var getTertiumQuid = function(gMediant,gTermination) {
    var match = gTermination.match(/([^r]+)\s+[a-m]r\s/);
    var gTertium = match[1];
    // a hack for Introit tone 6.
    match = gTertium.match(/^\([^)]+\)\s+'/);
    if(match) {
      gTertium = match[0] + gMediant.match(/\s([a-m])r\s/)[1];
    }
    match = gMediant.match(/(?:^|\s)([a-m]r\s+.+)$/);
    gTertium += ' ' + match[1];
    return gTertium;
  }
  
  var psalmToneIntroitGloriaPatri = function(gMediant,gTermination,gAmenTones,clef) {
    var gp = "Glória Patri, et Fílio, † et Spirítui Sancto.\nSicut erat in princípio, † et nunc, et semper, * et in sǽcula sæculórum. Amen.".split('\n');
    var result = applyPsalmTone({
      text: gp[0],
      gabc: gMediant,
      clef: clef,
      format: bi_formats.gabc,
      flexEqualsTenor: true
    });
    result = result + ' *(:) ';
    
    var gTertium = getTertiumQuid(gMediant,gTermination);
    gp[1] = gp[1].split('*');
    var temp = applyPsalmTone({
      text: gp[1][0].trim(),
      gabc: gTertium,
      clef: clef,
      format: bi_formats.gabc,
      flexEqualsTenor: true
    });
    result += temp + ' (:) ';
    temp = applyPsalmTone({
      text: gp[1][1].trim(),
      gabc: gTermination,
      clef: clef,
      format: bi_formats.gabc,
      flexEqualsTenor: true
    });
    if(gAmenTones){
      var originalGabc = gAmenTones.input || '',
          originalClef = originalGabc.slice(getHeaderLen(originalGabc)).match(regexGabcClef);
      originalClef = originalClef? originalClef[1] : clef;
      for(var i=3,index=temp.length; i>1; --i) {
        index = 1 + temp.lastIndexOf('(',index-2);
        if(index>0) {
          var index2 = temp.indexOf(')',index);
          if(index2>=0) {
            // shift the amen tones so that the psalm tone starting pitch matches the starting pitch of the Glória Patri.
            var shift = parseInt(gMediant[0],23) - parseInt(gAmenTones[1],23);
            if(isNaN(shift)) shift = 0;
            temp = temp.slice(0,index) + shiftGabc(gAmenTones[i],shift) + temp.slice(index2);
          }
        }
      }
    }
    return applyLiquescents(result + temp + " (::)\n");
  }
  
  var isAlleluia = function(part,text){
    return part=='alleluia' || (part.match(/^graduale/) && removeDiacritics(text).match(/^allelu[ij]a/i));
  }

  var getIntroitTone = function(part) {
    var gabc = part.gabc;
    if(!gabc) return;
    var tone = g_tones['Introit ' + part.mode];
    var mediant = tone.mediant;
    var termination = tone.termination;
    if(!termination) {
      termination = mediant;
    }
    var clef = gabc.slice(getHeaderLen(gabc)).match(regexGabcClef);
    if(clef) {
      clef = clef[1];
      if(clef != tone.clef) {
        var result = shiftGabcForClefChange([mediant, termination],clef,tone.clef);
        mediant = result[0];
        termination = result[1];
      }
    } else clef = tone.clef;
    return {
      clef: clef,
      mediant: mediant,
      termination: termination,
    };
  }

  var getAspergesVerseAndGloriaPatriGabc = function(part) {
    var gabc = part.gabc;
    var tone = getIntroitTone(part);
    if(!tone) return;
    var lastDoubleBar = gabc.lastIndexOf('(::)');
    if(lastDoubleBar < 0) throw "no double bar found in gabc: " + gabc;
    lastDoubleBar += 4;
    var verse = "Miserére mei Deus,\nsecúndum magnam misericórdiam tuam.".split('\n');
    return gabc.slice(0,lastDoubleBar) + '<i>Ps.~50.</i> ' + applyLiquescents(applyPsalmTone({
      text: verse[0],
      gabc: tone.mediant,
      clef: tone.clef,
      format: bi_formats.gabc,
      flexEqualsTenor: true
    }) + ' *(:)' + applyPsalmTone({
      text: verse[1],
      gabc: tone.termination,
      clef: tone.clef,
      format: bi_formats.gabc,
      flexEqualsTenor: true
    }) + ' (::)' + psalmToneIntroitGloriaPatri(tone.mediant,tone.termination,null,tone.clef));
  }

  var removeGloriaPatriGabc = function(part) {
    return part.gabc.replace(regexGabcGloriaPatriEtFilio,'');
  }

  var getFullGloriaPatriGabc = function(part) {
    var gabc = part.gabc;
    var tone = getIntroitTone(part);
    if(!tone) return;
    var amenTones = regexGabcGloriaPatri.exec(gabc);
    if(amenTones) {
      // amenTones[1] is the first group of regexGabcGloriaPatri, which is the first note of the Gló- syllable.
      // we need to check if the tone has been shifted to match the introit better:
      var shift = parseInt(amenTones[1],23) - parseInt(tone.mediant[0],23);
      if(!isNaN(shift) && shift != 0) { 
        tone.mediant = shiftGabc(tone.mediant,shift);
        tone.termination = shiftGabc(tone.termination,shift);
      }
    } else {
      amenTones = {index: gabc.length};
    }
    return gabc.slice(0,amenTones.index) + psalmToneIntroitGloriaPatri(tone.mediant,tone.termination,amenTones,tone.clef);
  }
  
  var getPsalmToneForPart = function(part){
    var text = sel[part].text;
    if(!text) return;
    var tone;
    var header = getHeader(sel[part].gabc||'');
    var termination = sel[part].termination;
    var mode = sel[part].mode;
    var altTone = sel[part].altTone;
    var solemn = sel[part].solemn;
    var isAl = isAlleluia(part,text);
    var introitTone = false;
    var $psalmEditor = $('[part='+part+'] .psalm-editor');
    $psalmEditor.find('syl.bold,syl.prep').removeClass('bold prep');
    if(part=='introitus' || (isAl && sel[part].style != 'psalm-tone2') || (header.officePart == 'Hymnus')) {
      tone = g_tones['Introit ' + mode];
      introitTone = true;
    } else {
      tone = g_tones[mode + '.' + (altTone? ' alt' : '')];
    }
    if(!tone) return;
    var clef = tone.clef;
    var gMediant = (solemn && tone.solemn) || tone.mediant;
    var gTermination = tone.termination;
    if(!gTermination) {
      if(!(gTermination = tone.terminations[termination])) {
        for(i in tone.terminations) { gTermination = tone.terminations[i]; break; }
      }
    }
    if(!introitTone && $psalmEditor.length) {
      var tones = getGabcTones(gMediant,undefined,false,clef);
      if(tones) {
        var $mediants = $psalmEditor.find('button[state=mediant]');
        $mediants.each(function() {
          $accents = $(this).prevAll('syl[accent]').slice(0,tones.accents).addClass('bold');
          $accents.first().nextAll('syl').slice(0,tones.afterLastAccent).addClass('bold');
          $accents.last().prevAll('syl').slice(0,tones.preparatory).addClass('prep');
        })
      }
      var tones = getGabcTones(gTermination,undefined,false,clef);
      if(tones) {
        var $terminations = $psalmEditor.find('button[state=new-verse]').add($psalmEditor.find('syl').last());
        $terminations.each(function() {
          $accents = $(this).prevAll('syl[accent]').slice(0,tones.accents).addClass('bold');
          $accents.first().nextAll('syl').slice(0,tones.afterLastAccent).addClass('bold');
          $accents.last().prevAll('syl').slice(0,tones.preparatory).addClass('prep');
        })
      }
    }
    var noMediant = getTertiumQuid(gTermination,gMediant);
    var gabc;
    var lines;
    var useOriginalClef = text.indexOf('@') >= 0;
    var fullGabc = sel[part].gabc.slice(getHeaderLen(sel[part].gabc));
    var originalClef = fullGabc.match(regexGabcClef);
    if(originalClef) originalClef = originalClef[1];
      
    if(isAl) {
      if(sel[part].style=='psalm-tone1') {
        lines = text.split('\n');
        var i = lines.length - 1;
        if(part == 'alleluia') lines[i] = lines[i].replace(/([\.!?:;,]?)\s*$/,function(m,a){ return ', Allelúia' + a; });
        var line = lines[0];
        gabc = header + '(' + tone.clef + ') ';
        if(line.match(/ij|bis/)) {
          if(part.match(/^graduale/) && sel['alleluia'].style=='psalm-tone1') {
            lines[i] = lines[i].replace(/([\.!?:;,]?)\s*$/,function(m,a){ return ', Allelúia' + a; });
          }
          line = line.match(/s*([^!?.;,:\s]+)/)[1];
          line = capitalizeForBigInitial(line + ', ' + line + '.');
          gabc += applyPsalmTone({
              text: line,
              gabc: gTermination,
              clef: clef,
              useOpenNotes: false,
              useBoldItalic: false,
              onlyVowel: false,
              format: bi_formats.gabc,
              prefix: false,
              suffix: false,
              italicizeIntonation: false,
              favor: 'termination',
              flexEqualsTenor: introitTone
            }) + " (::)\n";
        } else {
          // dealing with an Alleluia verse during the Easter season (one without "bis" or "ij" after the Alleluia antiphon)
          if(sel.graduale.style=='psalm-tone1') {
            $('#selStyleGraduale').change();
          } else {
            $('#selStyleGraduale').val('psalm-tone1').change();
          }
        }
      } else {
        // alleluia, but not full psalm tone:
        if(part.match(/^graduale/)) {
          if(sel['alleluia'].style=='psalm-tone1') {
            $('#selStyleAlleluia').val('psalm-tone').change();
          }
        } else if(sel.graduale.style=='psalm-tone1') {
          // update graduale so that it doesn't end with an extra "alleluia"
          $('#selStyleGraduale').change();
        }
        if(sel[part].style=='psalm-tone-sal') {
          gabc = alleluiaChantsAbreges[mode];
          if(text.split('\n')[0].match(/ij|bis/)) {
            gabc = gabc.replace(')ia.(',')ia. <i>ij.</i>(');
          }
        } else {
          $('[part='+part+']').addClass('full-alleluia');
          var match = sel[part].gabc.match(/\([^):]*::[^)]*\)/);
          gabc = sel[part].gabc.slice(0,match.index+match[0].length)+'\n';
        }
        useOriginalClef = true
        lines = sel[part].text.split('\n');
      }
      lines.splice(0,1);
    } else {
      // not alleluia
      lines = capitalizeForBigInitial(sel[part].text).split('\n');
      gabc = header;
      if(sel[part].style == 'psalm-tone1') {
        // the first verse is to be full tone.
        var firstVerse = /^([\s\S]*?\S*)(\([^)]*::[^)]*\))/g.exec(fullGabc);
        if(firstVerse) {
          firstVerse = firstVerse[1] + '(::) ';
          gabc += firstVerse;
          useOriginalClef = true;
          lines.shift();  // shift away the first verse, since we are using the full tone for it.
          var firstVersePattern = sel[part].pattern[0];
          for(var i=0; i < firstVersePattern.length; ++i) {
            if(firstVersePattern[i]=='℣') lines.shift(); // shift away any artificial verses so that the psalm toned part starts at the actual verse.
          }
        } else {
          gabc += '(' + tone.clef + ') ';
        }
      } else {
        gabc += '(' + (useOriginalClef? originalClef : tone.clef) + ') ';
      }
    }
    if(useOriginalClef && originalClef && originalClef != tone.clef) {
      clef = originalClef;
      var result = shiftGabcForClefChange([gMediant, gTermination],clef,tone.clef);
      gMediant = result[0];
      gTermination = result[1];
    }
    var gTertium = introitTone && getTertiumQuid(gMediant,gTermination);
    

    var firstVerse = true;
    var asGabc = true;      // Right now this is hard coded, but perhaps I could add an option to only do the first verse, and just point the rest.
    var wordsInLine = function(line) {
      return ((line || '').match(/[a-zœæǽáéíóúýäëïöüÿāēīōūȳăĕĭŏŭ]+/ig) || []).length;
    }
    var newClef = null;
    var countWordsBefore = 0;
    for(var i=0; i<lines.length; ++i) {
      var countWordsInVerse = wordsInLine(lines[i]);
      var fullVerseGabc = sel[part].originalWords.slice(countWordsBefore, countWordsBefore + countWordsInVerse);
      var nextNewClef = regexGabcClef.exec(fullVerseGabc);
      nextNewClef = nextNewClef && nextNewClef[1];
      countWordsBefore += countWordsInVerse;
      if(lines[i][0] == '@') {
        if(newClef && newClef != clef) {
          gabc = gabc.replace(/\(::\)(\s*)$/,'(z0::' + newClef + ')$1');
          clef = newClef;
        }
        gabc += fullVerseGabc;
        // check for clef changes within this verse GABC:
        newClef = nextNewClef;
        if(newClef && newClef != clef) {
          var result = shiftGabcForClefChange([gMediant, gTermination],newClef,clef);
          gMediant = result[0];
          gTermination = result[1];
          clef = newClef;
        }
        newClef = null;
        continue;
      } else {
        newClef = newClef || nextNewClef;
      }

      var line = splitLine(lines[i], introitTone? 3 : 2);
      var italicNote = line[0].match(/^\s*<i>[^<]+<\/i>\s*/);
      if(italicNote) {
        italicNote = italicNote[0];
        line[0] = line[0].slice(italicNote.length);
      }
      // special case for gloria patri.
      if(part=='introitus' && removeDiacritics(line[0]).match(/^\s*gloria patri/i) &&
          lines[i+1] && removeDiacritics(lines[i+1]).match(/^\s*[sa.\s]*e[c.\s]*u[l.\s]*o[r.\s]*u[m.*\s]*a[m.\s]*e/i)) {
        var gAmenTones;
        var originalGabc = sel[part].gabc;
        var header;
        if(originalGabc && (header = getHeader(originalGabc)) && header.mode == mode) {
          gAmenTones = regexGabcGloriaPatri.exec(originalGabc);
        }
        gabc += psalmToneIntroitGloriaPatri(gMediant,gTermination,gAmenTones,clef);
        ++i;
      } else if(firstVerse || asGabc) {
        var result={shortened:false};
        if(introitTone && line.length == 3) { //TODO: Make this optional perhaps
          var left = [line[0], line[1]];
          line.splice(1,1);
          gabc += (italicNote||'') + applyPsalmTone({
            text: left[0].trim(),
            gabc: gMediant,
            clef: clef,
            useOpenNotes: false,
            useBoldItalic: false,
            onlyVowel: false,
            format: bi_formats.gabc,
            verseNumber: i+1,
            prefix: !firstVerse && !italicNote,
            suffix: false,
            italicizeIntonation: false,
            result: result,
            favor: 'intonation',
            flexEqualsTenor: introitTone
          }) + bi_formats.gabc.nbsp + '(:) ' +
          (italicNote||'') + applyPsalmTone({
            text: left[1].trim(),
            gabc: gTertium,
            clef: clef,
            useOpenNotes: false,
            useBoldItalic: false,
            onlyVowel: false,
            format: bi_formats.gabc,
            verseNumber: i+1,
            prefix: false,
            suffix: false,
            italicizeIntonation: false,
            result: result,
            favor: 'intonation',
            flexEqualsTenor: introitTone
          });
        } else {
          gabc += (italicNote||'') + applyPsalmTone({
            text: line[0].trim(),
            gabc: line.length==1? noMediant : gMediant,
            clef: clef,
            useOpenNotes: false,
            useBoldItalic: false,
            onlyVowel: false,
            format: bi_formats.gabc,
            verseNumber: i+1,
            prefix: !firstVerse && !italicNote,
            suffix: false,
            italicizeIntonation: false,
            result: result,
            favor: i == 0? 'intonation' : '',
            flexEqualsTenor: introitTone
          });
        }
        gabc += (line.length == 1? "" : bi_formats.gabc.nbsp + gabcStar + "(:) " +
          applyPsalmTone({
            text: line[1].trim(),
            gabc: gTermination,
            clef: clef,
            useOpenNotes: false,
            useBoldItalic: false,
            onlyVowel: false,
            format: bi_formats.gabc,
            verseNumber: i+1,
            prefix: false,
            suffix: true,
            italicizeIntonation: false,
            favor: 'termination',
            flexEqualsTenor: true
          })) + " (::)\n";
        if(i==0) {
          //if(!repeatIntonation)gMediant=removeIntonation($.extend(true,{},gMediant));
          flex = (line[0].indexOf(sym_flex) >= 0);
        }
        if(!result.shortened)firstVerse=false;
      } /*else {
        if(gabc && !flex) {
          var flexI = line[0].indexOf(sym_flex);
          if(flexI >= 0) {
            var syls = getSyllables(line[0].slice(0,flexI));
            var index = syls.length - 1;
            syls[index].punctuation += ' ' + sym_flex;
            syls[index].space = "";
            var sylcount = syls[index].word.length;
            index -= sylcount - 1;
            while((syls.length - index) < 3) {
              --index;
              sylcount = syls[index].word.length;
              index -= sylcount - 1;
            }
            syls.splice(0,index);
            gabc += "<i>Flex :</i>() " + applyPsalmTone({
              text: syls,
              gabc: getFlexGabc(medTones),
              useOpenNotes: false,
              useBoldItalic: false,
              onlyVowel: onlyVowels,
              format: gabcFormat
            });
            gabc = gabc.slice(0,-1) + new Array(4).join(" " + medTones.toneTenor) + "  ::)";
            flex = true;
          }
        }
        var tempString=addBoldItalic(line[0], medTones.accents, medTones.preparatory, medTones.afterLastAccent, useFormat, onlyVowels, useNovaVulgata?"":i+1,true)
            + (line.length == 1? "" : ((((useFormat in bi_formats)&&bi_formats[useFormat])||bi_formats.gabc).nbsp) + "* " + addBoldItalic(line[1], terTones.accents, terTones.preparatory, terTones.afterLastAccent, useFormat, onlyVowels,useNovaVulgata?"":i+1,false,true));
        vr += tempString + '\n';
        r += "<p style='line-height:100%;margin: 6pt 0px;'>"
          + tempString
          + "</p>";
      } */
    }
    
    
    return applyLiquescents(gabc);
  }

  var updateTextAndChantForPart = function(part, updateFromOldScore) {
    var gabc,
        capPart = part[0].toUpperCase()+part.slice(1),
        $div = $('#div'+capPart),
        $txt = $('#txt'+capPart);
    switch(sel[part].style) {
      case 'full':
        $txt.val((gabc = sel[part].gabc));
        if(isAlleluia(part,sel[part].text)) {
          if(part.match(/^graduale/)) {
            if(sel.alleluia.style == 'psalm-tone1') {
              $('#selStyleAlleluia').val('psalm-tone').change();
            }
          } else {
            if(isAlleluia('graduale',sel.graduale.text) &&
                sel.graduale.style == 'psalm-tone1') {
              // update graduale so that it doesn't end with an extra "alleluia"
              $('#selStyleGraduale').change();
            }
          }
        }
        break;
      case 'full-gloria':
        $txt.val((gabc = getFullGloriaPatriGabc(sel[part])));
        break;
      case 'psalm-tone1':
      case 'psalm-tone-sal':
        $div.removeClass('full-alleluia');
      case 'psalm-tone':
      case 'psalm-tone2':
        $txt.val(sel[part].text);
        gabc = getPsalmToneForPart(part);
        break;
      default:
        return;
    }
    sel[part].activeGabc = gabc;
    if(gabc) {
      updateExsurge(part, null, updateFromOldScore);
    } else {
      delete sel[part].score;
    }
  }
  function makeChantContextForSel(sel) {
    sel.ctxt = makeExsurgeChantContext();
  };
  $.each(sel,function(){
    makeChantContextForSel(this);
  });

  // this function removes the entire alleluia of a T.P. Alleluia when outside of paschal time and removes the "T.P" direction when in it.
  function removeNotApplicableFromGabc(gabc) {
    var TP = selTempus == 'Pasch';
    if(gabc.match(/[+†][^)]*\(/) && gabc.match(/<i>\s*T\.\s*P\.\s*<\/i>|<i>.*?extra\s+T\.\s+P\./i)) {
      // if it has a + (†) that marks T.P or extra T.P
      if((TP && gabc.match(/<i>\s*T\.\s*P\.\s*<\/i>/i)) || ((!TP && gabc.match(/<i>.*?extra\s+T\.\s+P\./i)))) {
        // remove the part that is not marked second (the part before _T. P._ or _Extra T. P._)
        gabc = gabc.replace(/[+†](\([^)]+\)\s?)?[^+†]+?(([+†]|<\/i>)+[^\w()]*(\(:*\)\s*)*)+\s*/,'$1');
      } else {
        // remove the + marker and the second part [the part after the (::)]:
        gabc = gabc.replace(/[+†](?:\(\))?\s*([^+†]+?)(?:<i>.*?<\/i>)?(\(::\)).*/,'$1$2');
      }
    }
    if(TP) {
      gabc = gabc.replace(/(?:\(::\)\s+)?<i>\s*T\.\s*P\.\s*<\/i>(?:\(::\))?/,'(:)');
    } else {
      gabc = gabc.replace(/\(::\)\s+<i>\s*T\.\s*P\.\s*<\/i>[\s\S]*?(?=\(::\))/,'')
        .replace(/<i>\s*T\.\s*P\.\s*<\/i>\(::\)[\s\S]*?(?=[^\s(]*\(::\))/,'');
    }
    return gabc;
  }

  var updateExsurge = function(part, id, updateFromOldScore) {
    var prop = sel[part];
    var ctxt = prop.ctxt;
    var gabc = prop.activeGabc;
    gabc = removeNotApplicableFromGabc(gabc);
    gabc = gabc.replace(/<v>\\([VRA])bar<\/v>/g,function(match,barType) {
        return barType + '/.';
      }).replace(/<sp>([VRA])\/<\/sp>\.?/g,function(match,barType) {
        return barType + '/.';
      }).replace(/(\)\s+)([^()]*V\/\.\s*\d+\.?)(?=[ (])/g,'$1^$2^') // make any versical symbols followed by numerals red
      .replace(/(\s*)((?:<(\w+)>[^()]*?<\/\3>)?(?:<(\w+)>[^()]*?<\/\4>|[^()<>])+)(?=\s+[^\s()]+\([^)])/g, function(match, whitespace, main) {
        return (main.match(/[|^]|^\s*$/) || (main.match(/[aeiouyáéíóúýæǽœë]/i) && !main.match(/<\w+>/)))? match : (whitespace + '^' + main + '^');
      })
      .replace(/\)(\s+)(\d+\.?|[*†])(\s)/g,')$1$2()$3')
      // .replace(/(\s)(<i>[^<()]+<\/i>)\(\)/g,'$1^$2^()') // make all italic text with empty parentheses red
      .replace(/([^)]\s+)([*†]|<i>i+j\.<\/i>)\(/g,'$1^$2^(') // make all asterisks and daggers red
      .replace(/\^?(<i>[^(|]*? [^(|]*?<\/i>)\^?([^(|]*)/g,'{}^$1$2^') // make any italic text containing a space red
      .replace(/\*(\([:;,]+\))\s+(<i>i+j\.<\/i>)\(/g,'{*} $2$1 (')
      .replace(/(\s+)({?<i>i+j\.<\/i>}?)\(/g,'$1^$2^(') // make any italicized ij. syllables red
      .replace(/<b><\/b>/g,'')
      .replace(/<sp>'(?:ae|æ)<\/sp>/g,'ǽ')
      .replace(/<sp>'(?:oe|œ)<\/sp>/g,'œ́')
      .replace(/(<b>[^<]+)œ́/g,'$1œ</b>\u0301<b>') // œ́ character doesn't work in the bold version of this font.
      .replace(/<v>\\greheightstar<\/v>/g,'*')
      .replace(/<\/?sc>/g,'%')
      .replace(/<\/?b>/g,'*')
        .replace(/(?:{})?<i>\(([^)]+)\)<\/i>/g,'_{}$1_') // There is no way to escape an open parenthesis in Exsurge.
      .replace(/<\/?i>/g,'_')
      .replace(/(\)\s+(?:\([^)]*\))*)(\s*[^(^|]+)(?=\(\))/g,'$1^$2^') // make all text with empty parentheses red
        .replace(/<v>[^<]+<\/v>/g,'')  // not currently supported by Exsurge
        .replace(/\[([^\]]+)\](?=\()/g,'\|$1')  // Translations are basically just additional lyrics
        .replace(/([^c])u([aeiouáéíóú])/g,'$1u{$2}'); // center above vowel after u in cases of ngu[vowel] or qu[vowel]
    var gabcHeader = getHeader(gabc);
    if(gabcHeader.original) {
      gabc = gabc.slice(gabcHeader.original.length);
    }
    prop.gabcHeader = gabcHeader;
    prop.activeExsurge = splicePartGabc(part, gabc);
    prop.noDropCap = ('initialStyle' in gabcHeader)? gabcHeader.initialStyle === '0' : (id && id.match && id.match(/-/));
    updateFromActiveExsurge(part, id, updateFromOldScore);
  }
  function updateFromActiveExsurge(part, id, updateFromOldScore) {
    var chantContainer = $('#'+part+'-preview')[0];
    var prop = sel[part];
    var ctxt = prop.ctxt;
    var score = prop.score;
    var gabc = prop.activeExsurge;
    var gabcHeader = prop.gabcHeader;
    if(score && updateFromOldScore) {
      exsurge.Gabc.updateMappingsFromSource(ctxt, score.mappings, gabc);
      score.updateNotations(ctxt);
    } else {
      var mappings = exsurge.Gabc.createMappingsFromSource(ctxt, gabc);
      score = prop.score = new exsurge.ChantScore(ctxt, mappings, !prop.noDropCap);
    }
    ctxt.width = 0;
    prop.mapExsurgeToGabc = makeExsurgeToGabcMapper(gabc, prop.activeGabc);
    if(gabcHeader.original) {
      var annotationArray = sel[part].annotationArray || gabcHeader.annotationArray;
      if(annotationArray) {
        score.annotation = new exsurge.Annotations(ctxt, '%'+annotationArray[0]+'%', '%'+annotationArray[1]+'%');
      } else if(gabcHeader.annotation) {
        score.annotation = new exsurge.Annotations(ctxt, '%'+gabcHeader.annotation+'%');
      } else if(!prop.noDropCap && (gabcHeader.mode || gabcHeader['office-part'])) {
        var annotation;
        if(gabcHeader['office-part']) annotation = partAbbrev[gabcHeader['office-part'].toLowerCase()];
        if(annotation) {
          score.annotation = new exsurge.Annotations(ctxt, '%'+annotation+'%', '%'+romanNumeral[gabcHeader.mode]+'%');
        } else if(gabcHeader.mode) {
          score.annotation = new exsurge.Annotations(ctxt, '%'+romanNumeral[gabcHeader.mode]+'%');
        }
      }
    }
    layoutChant(part, false, id);
  }
  var queue = [];
  function processQueue() {
    var callback;
    while(callback = queue.shift()) {
      callback();
    }
  }

  function makeSvgNoMoreThanHalfWindowHeight(svg,parent) {
    var height, width;
    if(svg.hasAttribute('width') && svg.hasAttribute('height')) {
      width = parseFloat(svg.getAttribute('width'));
      height = parseFloat(svg.getAttribute('height'));
    } else if(svg.hasAttribute('viewBox')) {
      var match = svg.getAttribute('viewBox').match(/0 0 ([0-9.]+) ([0-9.]+)/);
      width = parseFloat(match[1]);
      height = parseFloat(match[2]);
    }
    if(width && height) {
      var availableWidth = (parent || svg.parentElement).clientWidth;
      var scale = Math.max(0.8, (window.innerHeight * 0.4) / height);
      scale = Math.min(scale, availableWidth / width);
      svg.style.width = width * scale;
      svg.style.marginLeft = (availableWidth - (width * scale)) / 2;
    }
  }

  var layoutChant = function(part, synchronous, id) {
    var isIE11 = navigator.userAgent.match(/Trident\/7\.0/);
    var chantContainer = $('#'+part+'-preview');
    chantContainer.attr('gregobase-id', id || null);
    if(!chantContainer.length || !chantContainer.is(':visible')) return;
    var ctxt = sel[part].ctxt;
    var score = sel[part].score;
    if(!score) return;
    var availableWidth = chantContainer.width();
    if(availableWidth == 0) {
      availableWidth = $(document.body).width() - 16;
    }
    var newWidth = Math.min(624, availableWidth);
    var useNoMoreThanHalfHeight = false;
    if(sel[part].sticky) {
      if(newWidth == availableWidth) {
        newWidth = Math.floor(newWidth / 0.8);
      } else {
        useNoMoreThanHalfHeight = true;
      }
    }

    var allSvg = chantContainer.find('svg'),
        svg = allSvg[0];
    if(!synchronous && allSvg.length == 1 && ctxt.width == newWidth) {
      if(newWidth == availableWidth && svg && svg.hasAttribute('viewBox')) {
        var match = svg.getAttribute('viewBox').match(/0 0 ([0-9.]+) ([0-9.]+)/);
        svg.setAttribute('width',match[1]);
        svg.setAttribute('height',match[2]);
        svg.removeAttribute('viewBox');
      } else if(newWidth != availableWidth && svg && svg.hasAttribute('width')) {
        svg.setAttribute('viewBox','0 0 ' + svg.getAttribute('width') + ' ' + svg.getAttribute('height'));
        if(!isIE11) {
          svg.removeAttribute('width');
          svg.removeAttribute('height');
        }
      }
      svg.style.width = '';
      svg.style.marginLeft = '';
      if(useNoMoreThanHalfHeight) {
        makeSvgNoMoreThanHalfWindowHeight(svg);
      }
      updateTextSize(part);
      return;
    }
    ctxt.width = newWidth;
    // perform layout on the chant
    if(synchronous) {
      if(ctxt.width != newWidth) {
        score.performLayout(ctxt);
        score.layoutChantLines(ctxt, ctxt.width);
      }
      // render the score to svg code
      chantContainer.empty().append(score.createSvgNodeForEachLine(ctxt));
      updateTextSize(part);
    } else {
      score.performLayoutAsync(ctxt, function() {
        score.layoutChantLines(ctxt, ctxt.width, function() {
          // render the score to svg code
          var svg = score.createSvgNode(ctxt);
          if(useNoMoreThanHalfHeight) {
            makeSvgNoMoreThanHalfWindowHeight(svg,chantContainer[0]);
          }
          if(newWidth == availableWidth) {
            svg.removeAttribute('viewBox');
          } else {
            if(!isIE11) {
              svg.removeAttribute('width');
              svg.removeAttribute('height');
            }
          }
          chantContainer.empty().append(svg);
          var callback = function() {
            updateTextSize(part);
          };
          queue.push(callback);
          setTimeout(processQueue, 100);
        });
      });
    }
  }
  var relayoutAllChant = function(synchronous) {
    $('.first-showing-chant').removeClass('first-showing-chant');
    $('div[part].showing-chant').first().addClass('first-showing-chant');
    updateStoredPageBreaks();
    $.each(sel, function(part) {
      layoutChant(part, synchronous);
    });
  };
  var relayoutAllChantSync = function() {
    relayoutAllChant(true);
  };
  var relayoutAllChantAsync = function() {
    relayoutAllChant(false);
  };
  $(window).on('resize', relayoutAllChantAsync);
  
  var updateTextSize = function(part){
    var capPart = part[0].toUpperCase()+part.slice(1),
        $part = $('#div'+capPart),
        isShowing = $part.hasClass('show-gabc');
    if(isShowing) {
      var $txt = $('#txt'+capPart),
          $preview = $('#'+part+'-preview');
          
      $txt.css('min-height',$preview.parents('.chant-parent').height() - $($txt.prop('labels')).height()).trigger('autosize');
    }
  }
  
  var splitGabc = function(gabc){
    var result=[];
    var lines=gabc.split(/\r?\n/);
    var state=0;
    var current='';
    $.each(lines,function(i,line){
      switch(state){
        case 0:
          if(line.match(/^%%$/))state=1;
          break;
        case 1:
          if(line.match(/^\s*[-\w]+:[^;]+;\s*$/)){
            state=0;
            result.push(current);
            current='';
          }
          break;
      }
      current += line + '\n';
    });
    if(current.length)result.push(current);
    return result;
  }

  
  var $selSunday = $('#selSunday');
  var $selSaint = $('#selSaint');
  var $selMass = $('#selMass');
  var $selTempus = $('#selTempus');
  var $selSundayNovus = $('#selSundayNovus');
  var $selYearNovus = $('#selYearNovus');
  var $selOrdinary = $('#selOrdinary');
  var firstClassSaints = saintKeys.filter(function(saint) { return saint.class == 1; }).reduce(function(result, saint) {
    result[saint.key] = saint;
    return result;
  }, {});
  $('#selSunday,#selSaint,#selMass').change(selectedDay);
  $selSundayNovus.change(selectedDayNovus);
  $selYearNovus.change(function(){
    selYearNovus = $(this).val();
    addToHash('yearNovus', selYearNovus);
    updateAllParts();
  });
  $selTempus.change(selectedTempus);
  $selOrdinary.change(selectedOrdinary).change();
  var key = (navigator.language || navigator.browserLanguage || 'en').match(/en/)?'en':'title';
  if(location.search.match(/\bla\b/)) key = 'title';
  var populate = function(keys,$sel) {
    var $optGroup;
    $.each(keys,function(i,o){
      if(typeof(o) == 'string') {
        var title = o.length==1? 'Year ' + o : o;
        o = o.match(/\.{3}$/)?
            {en: o, title: title}
          : {key: o, en: title, title: title};
      }
      if(o.group) {
        $optGroup = $('<optgroup></optgroup>').attr('label',o[key]);
        $sel.append($optGroup);
        return;
      }
      var $temp = $('<option></option>').text(o[key]);
      if(typeof(o.key)=='string') {
        $temp.val(o.key);
      } else {
        $temp.attr('disabled',true);
        if(i==0) {
          $temp.attr('selected',true);
        }
      }
      ($optGroup||$sel).append($temp);
    });
  };
  var i = 1, j = null, toSplice = [];
  var now = moment().startOf('day');
  while(i < saintKeys.length) {
    var data = saintKeys[i];
    var m = moment(data.key,'MMMD');
    if(toSplice.length && m.isSameOrAfter(toSplice[0].moment)) {
      saintKeys.splice(i,0,toSplice.shift());
      data = saintKeys[i];
      m = data.moment;
    }
    if(data.class == 1 && coincidesWithFirstClassPropriumTemporum(m,data.transferIfSunday)) {
      m = getSpecialDateForFeast(m);
      data.title += " (" + m.format("YYYY: MMM D") + ")";
      data.en += " (" + m.format("YYYY: MMM D") + ")";
      data.moment = m;
      toSplice.push(data);
      saintKeys.splice(i,1);
      continue;
    }
    if(!j && m.isSameOrAfter(now)) j = i;
    ++i;
  }
  i = j
  var beginningOfYearEntry = {title:"(Principium Annis)",en:"(Beginning of the Year)"}
  var moveToEnd = saintKeys.splice(1,i - 1);
  if(i < saintKeys.length && i >= 1) saintKeys.push(beginningOfYearEntry);
  saintKeys = saintKeys.concat(moveToEnd);

  i = 1;
  var outoforder = {
    EmbWedSept: null,
    EmbFriSept: null,
    EmbSatSept: null,
    EmbSatSeptS: null,
    ChristusRex: null
  };
  while(i < sundayKeys.length) {
    var sunday = sundayKeys[i];
    var m = dateForSundayKey(sunday.key);
    if(!m.isValid()) console.error(sunday);
    sunday.date = m;
    if(sunday.key in outoforder) {
      outoforder[sunday.key] = sunday;
      sundayKeys.splice(i,1);
    } else {
      ++i;
    }
  }

  // Put EmbSatSept and ChristusRex in the proper order
  Object.keys(outoforder).forEach(function(key) {
    var toPlace = outoforder[key];
    var lastDate = moment('12-31','MM-DD');
    var i = 1;
    while(i < sundayKeys.length) {
      var sunday = sundayKeys[i];
      var next = sundayKeys[++i];
      if(!next || (sunday.date.isBefore(toPlace.date) && next.date.isSameOrAfter(toPlace.date))) {
        sundayKeys.splice(i, 0, toPlace);
        break;
      }
    }
  });

  var i = 1;
  while(i < sundayKeys.length) {
    var sunday = sundayKeys[i];
    var next = sundayKeys[++i];
    if(next && (sunday.date.isBefore(now) && next.date.isSameOrAfter(now))) {
      moveToEnd = sundayKeys.splice(1, i - 1);
      sundayKeys.push(beginningOfYearEntry);
      sundayKeys = sundayKeys.concat(moveToEnd);
      break;
    }
  }

  populate(sundayKeys,$selSunday);
  populate(sundaysNovusOrdo,$selSundayNovus);
  populate(saintKeys,$selSaint);
  populate(otherKeys,$selMass);
  populate(tempusKeys,$selTempus);
  populate(yearArray,$selYearNovus);

  var ordinaryKeys = massOrdinary.map(function(e,i){
    var name = '';
    ++i;
    if(i<=20) name = i + ' - ';
    if(e.name) {
      name += e.name + ' (' + e.season + ')';
    } else {
      name += e.season;
    }
    return {
      key: i.toString(),
      title: 'Missa ' + name,
      en: 'Mass ' + name
    }
  });
  ordinaryKeys.unshift({
    key: '',
    title: 'Ordinaria Missæ in cantu gregoriano',
    en: 'Chant Mass Ordinaries...'
  })
  populate(ordinaryKeys,$selOrdinary);
  populate([{name:"Select ad lib. chant", id: ""}].concat(miscChants).map(function(e) {
    return {
      key: e.id.toString(),
      title: e.name,
      en: e.name
    }
  }), $('#selCustom'));
  var $customTemplate = $('#divCustom');
  $.each(['','offertorium','communio','ite'], function(i,key) {
    var $custom = $customTemplate;
    if(key) {
      $custom = $customTemplate.clone().insertAfter('div[part=' + key + ']');
    }
    ++i;
    var appendI = function(x,s) { 
      return s.replace(/(custom)\d*/i,'$1'+i)
    };
    $custom.attr('id',appendI).attr('part',appendI);
    $custom.find('[id^=custom],[id*=Custom]').attr('id',appendI);
    $custom.find('[for*=Custom]').attr('for',appendI);
  });
  //Determine which year...Check when Advent begins this year, and if it is before today, use last year as the year number
  //When the year number is found, Take year = yearArray[year%3];
  var date = new Date(),
      year = date.getFullYear(),
      Christmas = new Date(year,11,25),
      Advent = Christmas.setDate(25 - (Christmas.getDay()||7) - 21);
  if(Advent > date) --year;
  $selYearNovus.val(yearArray[year%3]);
  $('.novus-options').hide();
  $('.novus-options select').change(function(){
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    novusOption[part] = this.selectedIndex;
    updatePart(part);
  });
  $('.ordinary select').change(function(){
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    selOrdinaries[part + 'ID'] = this.value;
    addToHash(part, $(this.options[this.selectedIndex]).attr('default')? false : this.value);
    updatePart(part, this.options[this.selectedIndex].innerText);
  })
  $('[part^=custom] select').change(function(){
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    selCustom[part + 'ID'] = this.value;
    if(!sel[part]) {
      sel[part] = {};
      makeChantContextForSel(sel[part]);
    }
    addToHash(part, $(this.options[this.selectedIndex]).attr('default')? false : this.value);
    updatePart(part, this.options[this.selectedIndex].innerText);
  });
  $('#btnCalendar').click(function(e){
    var $this = $(this);
    isNovus = !isNovus;
    if(isNovus) {
      $('#selSunday,#selSaint,#selMass,#selTempus').hide();
      $('#selSundayNovus,#selYearNovus').show();
      $this.text('Novus Ordo');
      $('#selSundayNovus').prop('selectedIndex',0).change();
    } else {
      $('#selSunday,#selSaint,#selMass,#selTempus').show();
      $('#selSundayNovus,#selYearNovus').hide();
      $this.text('Traditional');
      $('#selSunday').prop('selectedIndex',0).change();
    }
    $('#selKyrie').change();
  });
  function selStyleChanged(e){
    var style=this.value;
    if(this.id=='selStyle') {
      if(style!='mixed') {
        $('select[id^=selStyle]:not(#selStyle)').val(style).each(function(i,o){
          updateStyle(o.id.slice(8).toLowerCase(),style);
        });
      }
    } else {
      updateStyle(this.id.slice(8).toLowerCase(),style);
      var baseStyle = style.replace(/(-\w+|\d+)$/,'');
      $('select[id^=selStyle]:not(#selStyle)').each(function(i,o){if(baseStyle!=o.value.slice(0,baseStyle.length)){baseStyle='mixed';return false;}});
      $('#selStyle').val(baseStyle);
    }
  }
  function selTonesChanged(e){
    //update endings for this tone.
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    if((sel[part].style||'').match(/^psalm-tone/)) {
      addToHash('style'+capPart, sel[part].style + (this.value == sel[part].originalMode? '' : ';' + this.value + (defaultTermination[this.value]||'')));
    }
    var match = this.value.match(/^(\d+|per)((?: alt)?)$/);
    sel[part].mode = match[1];
    sel[part].altTone = match[2];
    $selEnding = $('#selToneEnding' + capPart);
    var tone = match[1] + '.' + match[2],
        endings = getEndings(tone);
    if(endings.length==0 || (isAlleluia(part,sel[part].text) && sel[part].style != 'psalm-tone2')) {
      $selEnding.hide();
    } else {
      $selEnding.empty().append('<option>' + endings.join('</option><option>') + '</option>');
      $selEnding.val(defaultTermination[this.value]);
      sel[part].termination = $selEnding.val();
      if(sel[part].style == 'psalm-tone') $selEnding.show();
    }
    updateTextAndChantForPart(part, true);
  }
  function selEndingsChanged(e){
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    if((sel[part].style||'').match(/^psalm-tone/)) {
      addToHash('style'+capPart, sel[part].style + ((sel[part].mode == sel[part].originalMode && this.value==defaultTermination[sel[part].mode])? '' : ';' + sel[part].mode + (sel[part].altTone? ' alt ' : '') + this.value));
    }
    sel[part].termination = this.value;
    updateTextAndChantForPart(part, true);
  }
  function cbSolemnChanged(e){
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    sel[part].solemn = this.checked;
    updateTextAndChantForPart(part, true);
  }
  function editorKeyUp(e){
    var capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    if((sel[part].style||'').match(/^psalm-tone/) && sel[part].text != this.value) {
      sel[part].text = this.value;
      updateTextAndChantForPart(part, true);
    } else if(sel[part].style == 'full' && sel[part].gabc != this.value) {
      sel[part].gabc = this.value;
      updateTextAndChantForPart(part, true);
    }
  }
  $('select[id^=selStyle]').change(selStyleChanged);
  $('#selStyle').change();
  $('select.endings').change(selEndingsChanged);
  $('input.cbSolemn').change(cbSolemnChanged);
  var $selTones = $('select.tones').change(selTonesChanged);
  function populateSelectWithTones($selTones, withAltsAndPeregrinus, doReplace) {
    if(doReplace) {
      $selTones.empty();
    } else {
      $selTones = $selTones.filter(':empty');
      if(!$selTones.length) {
        return;
      }
    }
    var single = (doReplace == 4 || doReplace == 6)? doReplace : null;
    for(var i=1; i<=8; ++i) {
      if(single) i = single;
      $selTones.append('<option>'+i+'</option>');
      if(withAltsAndPeregrinus && (i == 4 || i == 6)) {
        $selTones.append('<option>'+i+' alt</option>');
      }
      if(single) return;
    }
    if(withAltsAndPeregrinus) $selTones.append('<option>per</option>');
  }
  populateSelectWithTones($('[part=introitus] select.tones'));
  populateSelectWithTones($selTones, true);
  $('textarea[id^=txt]').autosize().keydown(internationalTextBoxKeyDown).keydown(gabcEditorKeyDown).keyup(editorKeyUp);
  var getAllGabc = window.getAllGabc = function() {
    var hash = parseHash();
    var name = ["sunday","sundayNovus","saint","mass"].reduce(function(result,id) {
      return result || ((id in hash) && id);
    }, null);
    if(name) {
      var $id = $('#sel'+name[0].toUpperCase()+name.slice(1));
      var val = $id.val();
      if(val == 'custom') {
        name = '';
      } else {
        name = $id[0].selectedOptions[0].innerText;
        name = name.replace(/^\w{3}\s+\d+\:\s+(.+)$/,'$1');
      }
    }
    var result=[];
    var isFirstChant = true;
    $('[part]').each(function(){
      var $this = $(this),
          part = $this.attr('part'),
          capPart = part[0].toUpperCase() + part.slice(1),
          $includePart = $('#include' + capPart),
          hasPageBreak = $includePart.find('.toggle-page-break').hasClass('has-page-break-before'),
          proper = sel[part],
          gabc = proper && (proper.activeGabc || proper.gabc || proper.effectiveGabc),
          header = getHeader(gabc);
      if($includePart.parent('li').hasClass('disabled') ||
        includePropers.indexOf(part)<0 ||
        !gabc) return;
      header.name = name || '';
      if(name) {
        header.commentary = ' ';
        name = '';
      }
      if(isFirstChant) {
        header['%fontsize'] = '20';
      }
      if(hasPageBreak && !isFirstChant) {
        header['%pageBreak'] = 'true';
      }
      header['%font'] = 'GaramondPremierPro';
      if(paperSize === 'a4') {
        header['%width'] = '7.27';
        header['%height'] = '11.69';
      } else {
        header['%width'] = '7.5';
      }
      gabc = header + gabc.slice(header.original.length);
      result.push(gabc);
      isFirstChant = false;
    });
    return result;
  };
  $('#lnkPdf').click(function(e){
    var result=getAllGabc().join('\n\n');    
    if(e && typeof(e.preventDefault)=="function"){
      e.preventDefault();
    }
    $('#pdfForm').attr('action','https://apps.illuminarepublications.com/gregorio/#' + encodeURI(result)).submit();
  });
  $('#lnkPdfDirect').click(function(e){
    var gabcs=getAllGabc();
    if(e && typeof(e.preventDefault)=="function"){
      e.preventDefault();
    }
    $('#pdfFormDirect [name="gabc[]"]').remove();
    for(var i=0;i<gabcs.length;++i){
      $('#pdfFormDirect').append($('<input type="hidden" name="gabc[]"/>').val(gabcs[i]));
    }
    $('#pdff_width').val(paperSize == 'a4'? 7.27 : 7.5);
    $('#pdff_height').val(paperSize == 'a4'? 11.69 : 11);
    $("#pdfFormDirect").submit();
  });
  $('[id$=-preview]').on('relayout',function(){
      var part = this.id.match(/^([a-z]+)-preview$/)[1];
      updateTextSize(part);
  });
  $('a[id^=include]').each(function(){
    includePropers.push(this.id.slice(7).toLowerCase());
  });
  $('ul.dropdown-menu').on('click','a[id^=include]',function(e){
    e.preventDefault();
    e.stopPropagation();
    var capPart = this.id.slice(7),
        part = capPart.toLowerCase(),
        i = includePropers.indexOf(part),
        $span = $(this).find('span.glyphicon').first();
    if(i<0) {
      // wasn't included, now it will be:
      includePropers.push(part);
      $span.removeClass('glyphicon-unchecked').addClass('glyphicon-check');
    } else {
      //had been included, now it won't be:
      includePropers.splice(i,1);
      $span.removeClass('glyphicon-check').addClass('glyphicon-unchecked');
    }
  }).on('click','.toggle-page-break', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var $span = $(this);
    $span.toggleClass('has-page-break-before');
    var hasPageBreakBefore = $('#dropdown-menu-include .toggle-page-break').map(function() { return $(this).hasClass('has-page-break-before'); }).toArray();
    var allPageBreaks = hasPageBreakBefore.reduce(function(a,b) { return a === b? b : 0; });
    var isMixed = 0 === allPageBreaks;
    $('#toggle-all-page-break').toggleClass('mixed', isMixed).toggleClass('has-page-break-before',isMixed || allPageBreaks);
    updateStoredPageBreaks();
  }).on('click','#toggle-all-page-break', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var $span = $(this);
    $span.toggleClass('has-page-break-before').removeClass('mixed');
    ['has-page-break-before'].reduce(function($spans,c) {
      return $spans.toggleClass(c, $span.hasClass(c));
    }, $('ul.dropdown-menu .toggle-page-break'));
    updateStoredPageBreaks();
  });
  pageBreaks.forEach(function(part) {
    $('#include'+part).find('.toggle-page-break').click();
  });
  function updateStoredPageBreaks() {
    pageBreaks = $('#dropdown-menu-include .toggle-page-break.has-page-break-before').parent().map(function() {return this.id.slice(7);}).toArray();
    localStorage.pageBreaks = pageBreaks.join(',');
    $('div[part]').removeClass('page-break-before');
    $(pageBreaks.map(function(part) { return 'div[part=' + part.toLowerCase() + ']'}).join(',')).addClass('page-break-before');
  }
  $('.dropdown-paper-size').on('click','li>a', function(e) {
    e.preventDefault();
    var $this = $(this),
        $icon = $this.find('span.glyphicon'),
        lbl = $this.find('.lbl').text();
    $('.dropdown-paper-size li>a').removeClass('b').find('span.glyphicon').removeClass('glyphicon-ok').addClass('glyphicon-blank');
    paperSize = localStorage.paperSize = lbl.toLowerCase();
    $('span.lbl-paper-size').text(lbl);
    $this.addClass('b');
    $icon.addClass('glyphicon-ok').removeClass('glyphicon-blank');
  });
  $('.dropdown-paper-size li>a[paper='+paperSize+']').click();
  $('a.toggleShowGabc').attr('href','');
  $('body').on('click','a.toggleShowGabc',function(e){
    e.preventDefault();
    var $this = $(this),
        $part = $this.parents().filter('[part]'),
        part = $part.attr('part');
        isShowing = $part.toggleClass('show-gabc').hasClass('show-gabc');
    $this.find('.showHide').text(isShowing?'Hide' : 'Show');
    layoutChant(part);
  });
  $('a.toggleShowChantPreview').attr('href','').click(function(e){
    e.preventDefault();
    var $this = $(this),
        $part = $this.parents().filter('[part]'),
        part = $part.attr('part');
        isShowing = !$part.toggleClass('hide-chant').hasClass('hide-chant');
    $this.find('.showHide').text(isShowing?'Hide' : 'Show');
    if(isShowing) layoutChant(part);
  });
  var customProperSelected = function(event,ui){
    var $this=$(this),
        capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase(),
        temp = chantID[part][ui.item.value];
    addToHash(part, (selPropers[part+'ID'] = (temp.Solesmes || temp).id || ''));
    sel[part].pattern = null;
console.info(JSON.stringify(selPropers));
    updatePart(part);
  };
  $.each(chantID,function(part){
    $.each(this,function(incipit){
      if(this.psalm) {
        $.each(this.psalm,function(psalmIncipit){
          var fullIncipit = incipit + ' ps. ' + psalmIncipit;
          chantID[part][fullIncipit] = this;
        });
        delete chantID[part][incipit];
      }
    });
  });
  $('input.sel-custom').each(function(){
    var $this=$(this),
        capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
        part = capPart.toLowerCase();
    $this.autocomplete({minLength:0,
                        select:customProperSelected,
                        source:Object.keys(chantID[part])})
         .keyup(function(){
            if(this.value == '' && selPropers[part + 'ID']) {
              delete selPropers[part + 'ID'];
              addToHash(part, false);
              updatePart(part);
            }
         });
  });
  if (window.matchMedia) {
    var mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener(function(mql) {
      if (mql.matches) {
        relayoutAllChantSync();
      } else {
        relayoutAllChantAsync();
      }
    });
  }
  window.onbeforeprint = relayoutAllChantSync;
  window.onafterprint = relayoutAllChantAsync;
  function removeSelIfPresent(s) {
    if(typeof(s) != 'string') return s;
    if(s.match(/^sel[A-Z]/)) {
      return s[3].toLowerCase() + s.slice(4);
    }
    return s;
  }
  var allowAddToHash = false,
      lastHandledHash = '';
  function clearHash(obj,key) {
    if(!allowAddToHash) return;
    lastHandledHash = location.hash = '';
    $('#selStyle').val('full');
    Object.keys(sel).forEach(function(key) {
      if(sel[key] && 'style' in sel[key]) {
        sel[key].style = 'full';
        delete sel[key].pattern;
        $('#selStyle' + key[0].toUpperCase() + key.slice(1)).val('full');
        resetPartStyle(key);
      }
    });
    addToHash(obj,undefined,true);
    loadStoredDataForKey(key);
  }
  /// addToHash(object)
  /// addToHash(key,value)
  function addToHash(a,b,dontStore) {
    if(!allowAddToHash) return;
    var hash = parseHash();
    if(!hash) return;
    if(typeof b == 'undefined') {
      Object.keys(a).forEach(function(key) {
        hash[removeSelIfPresent(key)] = a[key];
      });
    } else {
      hash[removeSelIfPresent(a)] = b || false;
    }
    if(hash.mass != 'custom') {
      $('input.sel-custom').each(function(){
        var $this=$(this),
            capPart = this.id.match(/[A-Z][a-z-]+\d*$/)[0],
            part = capPart.toLowerCase();
        delete hash[part];
      });
    }
    location.hash = hash;
    var key = ['sunday','saint','mass','sundayNovus'].reduce(function(result, key){
      return result || (hash[key] && key);
    },'');
    if(key && !dontStore) {
      var realKey = hash[key];
      delete hash[key];
      delete hash.tempus;
      var hashString = hash.toString();
      console.info(realKey, hashString);
      localStorage[realKey] = hashString;
      var storedKeys = JSON.parse(localStorage.storedKeys || "[]");
      var index;
      while((index = storedKeys.indexOf(realKey)) >= 0) {
        storedKeys.splice(index,1);
      }
      storedKeys.push(realKey);
      while(storedKeys.length > 4) {
        delete localStorage[storedKeys.shift()];
      }
      localStorage.storedKeys = JSON.stringify(storedKeys);
    }
  }
  function loadStoredDataForKey(key) {
    var hash = localStorage[key];
    if(hash) location.hash = (new LocationHash(hash+location.hash)).toString();
  }
  function hashChanged() {
    if(lastHandledHash !== location.hash) {
      lastHandledHash = location.hash;
      allowAddToHash = false;
      var hash = parseHash();
      ['sunday', 'sundayNovus', 'saint', 'mass',
       'tempus', 'yearNovus',
       'ordinary', 'custom1', 'custom2', 'custom3', 'custom4'].concat(ordinaryParts).forEach(function(key, i) {
        if(key in hash || (i > 5 && (i <= 10 || !('ordinary' in hash)))) {
          var $elem = $('#sel' + key[0].toUpperCase() + key.slice(1)),
              val = hash[key] || '';
          if($elem.val() != val) $elem.val(val).change();
        }
      });
      if(hash.mass == 'custom') {
        $('input.sel-custom').each(function(){
          var $this=$(this),
              capPart = this.id.match(/[A-Z][a-z]+\d*$/)[0],
              part = capPart.toLowerCase();
          if(hash[part]) {
            selPropers[part+'ID'] = hash[part];
            updatePart(part);
          }
        });
      }
      $('select[id^=selStyle]').each(function(){
        var $this=$(this),
            capPart = this.id.slice(3),
            part = capPart[0].toLowerCase() + capPart.slice(1),
            style = hash[part];
        if(style) {
          capPart = part.slice(5);
          part = capPart.toLowerCase();
          var pattern = hash[part+'Pattern'];
          if(pattern) {
            pattern = pattern.replace(/V/g,'℣').replace(/\d+/g,function(num) {
              return new Array(parseInt(num)).join(',');
            }).split(';').map(function(seg) {
              return seg.split(',');
            });
            sel[part].pattern = pattern;
          }
          styleParts = style.split(';');
          if($this.val() != styleParts[0]) {
            $this.val(styleParts[0]);
            if(part == 'graduale' && $this.val() != styleParts[0]) {
              $this.empty();
              $this.append($alleluiaOptions.clone());
              $this.val(styleParts[0]);
            }
            $this.change();
          }
          if(styleParts[1]) {
            var termination = styleParts[1],
                match = termination.match(/^((?:\d+|per)(?: alt)?)\s*([a-gA-G][-\*\d]?)?/),
                tone = match[1],
                ending = match[2],
                $selToneEnding = $('#selToneEnding' + capPart),
                $selTone = $('#selTone' + capPart);
            sel[part].overrideTone = tone;
            sel[part].overrideToneEnding = ending;
            if($selTone.val() != tone) $selTone.val(tone).change();
            if(ending && $selToneEnding.val() != ending) $selToneEnding.val(ending).change();
          }
        }
      });
    }
    allowAddToHash = true;
  }
  function splicePartGabc(part, gabc) {
    var splices = getSpliceForPart(part);
    $('div[part='+part+']').toggleClass('modified', !!splices.length);
    return spliceGabc(splices, gabc);
  }
  function spliceGabc(splices, gabc) {
    splices.forEach(function(splice){
      gabc = gabc.slice(0,splice.index) + (splice.addString||'') + gabc.slice(splice.index + splice.removeLen);
    });
    return gabc;
  }
  function getSpliceForPart(part) {
    var style = (sel[part].style||'');
    if((sel[part].isAlleluia && style.match(/^psalm-tone(1|-sal)$/)) ||
      (!sel[part].isAlleluia && style.match(/^psalm-tone/))) {
        return [];
    }
    var ordinaryId = selOrdinaries[part + 'ID'];
    var currentSplice;
    if(ordinaryId) {
      currentSplice = localStorage[part+ordinaryId+'Splice'];
    } else {
      currentSplice = parseHash()[part+'Splice'];
    }
    currentSplice = (currentSplice && currentSplice.split)? currentSplice.replace(/&/g,' ').split('|') : [];
    return currentSplice.map(function(s){
      var a = s.split('/');
      return {index: parseInt(a[0]), removeLen: parseInt(a[1]), addString: a[2]};
    });
  }
  function addSpliceToHash(part, splices) {
    var currentSplice = getSpliceForPart(part);
    splices = currentSplice.concat(splices);
    splices = splices.map(function(t){
      return [t.index, t.removeLen, t.addString||''].join('/');
    }).join('|').replace(/ /g,'&');
    var ordinaryId = selOrdinaries[part + 'ID'];
    if(ordinaryId) {
      localStorage[part+ordinaryId+'Splice'] = splices;
    } else {
      addToHash(part+'Splice',splices);
    }
  }
  function removeSplicesForPart(part) {
    var ordinaryId = selOrdinaries[part + 'ID'];
    if(ordinaryId) {
      delete localStorage[part+ordinaryId+'Splice'];
    } else {
      addToHash(part+'Splice',false);
    }
    updateExsurge(part, null, true);
  }
  $('#divExtraChants a').click(showHideExtraChants);
  $(window).on('hashchange',hashChanged);
  function editorialChange(e) {
    var regexGabcNote = /-?[a-mA-M]([oOwWvVrRsS]*)[xy#~\+><_\.'012345]*(?:\[[^\]]*\]?)*/,
        proper = sel[e.data.part],
        gabc = proper.activeExsurge,
        noteProperties = e.data.noteProperties,
        note = noteProperties.note,
        splice = {
          index: 0,
          removeLen: 0
        };
    switch(e.data.action) {
      case 'toggleBarBefore':
      case 'toggleBarAfter':
        var bar = e.data.barBefore || e.data.barAfter;
        var neumeIndex = note.neume && note.neume.score.notations.indexOf(note.neume);
        if(bar) {
          var mapping = bar.mapping,
              barIndex = mapping.notations.indexOf(bar);
          if(barIndex === 0) {
            splice.index = mapping.sourceIndex;
            splice.removeLen = mapping.source.length;
          } else {
            splice.index = bar.sourceIndex;
            splice.removeLen = 1;
          }
        } else if(e.data.action === 'toggleBarBefore') {
          if(neumeIndex) {
            var previousNeume = note.neume.score.notations[neumeIndex - 1];
            if(previousNeume.constructor == exsurge.TextOnly) {
              splice.addString = ',';
              splice.index = previousNeume.mapping.sourceIndex + previousNeume.mapping.source.length - 1;
              break;
            }
          }
          splice.index = (note.neume || note).mapping.sourceIndex;
          splice.addString = '(,) ';
        } else {
          if(e.data.after == 'note') {
            var notes = note.neume.mapping.notations.reduce(function(a,b) { return (a.concat(b.notes)) }, []);
            var noteIndex = notes.indexOf(note);
            if(noteIndex && notes[++noteIndex]) {
              splice.index = notes[noteIndex].sourceIndex;
              splice.addString = ',';
            }
            break;
          }
          if(neumeIndex) {
            var nextNeume = note.neume.score.notations[neumeIndex + 1];
            if(nextNeume.constructor == exsurge.TextOnly) {
              splice.addString = ',';
              splice.index = nextNeume.mapping.sourceIndex + nextNeume.mapping.source.length - 1;
              break;
            }
          }
          splice.index = (note.neume || note).mapping.sourceIndex + (note.neume || note).mapping.source.length;
          splice.addString = ' (,) ';
        }
        break;
      case 'addCarryOverBefore':
      case 'addCarryOverAfter':
        var bar = e.data.barBefore || e.data.barAfter;
        if(bar) {
          var mapping = bar.mapping,
              barIndex = mapping.notations.indexOf(bar);
          if(barIndex === 0) {
            var mappings = bar.score.mappings,
                index = mappings.indexOf(mapping) - 1,
                beforeBar = mappings[index];
            while(index >= 0 && beforeBar.notations.length == 1 && beforeBar.notations[0].constructor == exsurge.TextOnly) {
              beforeBar = mappings[--index] || mappings[0];
            }
            splice.index = beforeBar.sourceIndex + beforeBar.source.length - 1;
          } else {
            var prevIndex = mapping.notations[barIndex - 1].notes.slice(-1)[0].sourceIndex,
                substring = mapping.source.slice(prevIndex - mapping.sourceIndex),
                offset = Math.min(bar.sourceIndex - prevIndex, substring.match(/\s|$/).index)
            splice.index = prevIndex + offset;
          }
          splice.addString = '[ob:0;6mm]';
        }
        break;
      case 'removePunctum':
        splice.index = note.sourceIndex;
        var match = gabc.slice(splice.index).match(regexGabcNote);
        if(match) {
          splice.removeLen = match[0].length;
          if(match[1].length > 1) {
            // if it is a repeated virga, etc. just remove one of the repeat characters:
            splice.removeLen = 1;
            splice.index++;
          }
        }
        else splice.removeLen = 0;
        break;
      case 'removeEpisema':
        if(noteProperties.torculusNotes && noteProperties.torculusNotes.length) {
          var index = noteProperties.torculusNotes[0].sourceIndex,
              index2 = noteProperties.torculusNotes[2].sourceIndex,
              match = gabc.slice(index2).match(regexGabcNote);
          if(match) {
            var sub = gabc.slice(index,index2+match[0].length),
                regex = /_+/g;
            splice = [];
            while(match = regex.exec(sub)) {
              splice.unshift({
                index: index + match.index,
                removeLen: match[0].length
              });
            }
          }
        } else {
          splice.index = gabc.indexOf('_', note.sourceIndex);
          if(splice.index >= 0) splice.removeLen = 1;
          else splice.index = 0;
        }
        break;
      case 'torculus1':
      case 'torculus2':
      case 'torculus3':
      case 'torculus12':
        if(noteProperties.torculusNotes) {
          var index1 = noteProperties.torculusNotes[1].sourceIndex,
              index2 = noteProperties.torculusNotes[2].sourceIndex,
              match = [
                gabc.slice(index1).match(regexGabcNote),
                gabc.slice(index2).match(regexGabcNote)
              ];
          if(match[0] || match[1]) {
            var sub = [
                  match[0] && gabc.slice(index1,index1+match[0][0].length),
                  match[1] && gabc.slice(index2,index2+match[1][0].length)
                ],
                regex = /_+/;
            splice = [];
            for(var i = 1; i >= 0; --i) {
              var s = sub[i];
              if(!s) continue;
              if(match = regex.exec(s)) {
                splice.push({
                  index: noteProperties.torculusNotes[i+1].sourceIndex + match.index,
                  removeLen: match[0].length
                });
                if(i < 1) index2 -= match[0].length;
              }
            }
            switch(e.data.action) {
              case 'torculus2':
              case 'torculus12':
                splice.push({
                  index: index1 + 1,
                  removeLen: 0,
                  addString: (e.data.action==='torculus2')? '_' : '__'
                });
                break;
              case 'torculus1':
                splice.push({
                  index: index1,
                  removeLen: 0,
                  addString: '_'
                });
                break;
              case 'torculus3':
                if(splice[0]) splice[0].removeLen--;
                else splice.push({
                  index: index2 + 1,
                  removeLen: 0,
                  addString: '_'
                });
                break;
            }
          }
        }
        break;
      case 'addMora':
      case 'addEpisema':
        splice.index = note.sourceIndex;
        var match = gabc.slice(splice.index).match(regexGabcNote);
        if(match) {
          splice.index += match[0].length;
        } else {
          return;
        }
        splice.addString = (e.data.action == 'addMora')? '.' : '_';
        break;
      case 'removeMora':
        splice.index = gabc.indexOf('.', note.sourceIndex);
        if(splice.index >= 0) splice.removeLen = 1;
        else splice.index = 0;
        break;
      case 'removeQuilisma':
        splice.index = gabc.indexOf('w', note.sourceIndex);
        if(splice.index >= 0) splice.removeLen = 1;
        else splice.index = 0;
        break;
    }
    if(splice.constructor != [].constructor) splice = [splice];
    gabc = spliceGabc(splice, gabc);
    $('div[part='+e.data.part+']').addClass('modified');
    addSpliceToHash(e.data.part, splice);
    proper.activeExsurge = gabc;
    updateFromActiveExsurge(e.data.part, null, true);
  }
  var touchedElement = null;
  var originalTouch = null;
  $(document).on('click', '[data-toggle="dropdown"]', function(e) {
    $(this).parent('.btn-group').toggleClass('open');
    e.stopPropagation();
  }).on('click', '[part] button.remove-modifications', function(e) {
    var $part = $(this).parents('[part]'),
        part = $part.attr('part');
    removeSplicesForPart(part);
  }).on('touchstart touchmove', 'div.chant-preview', function(e) {
    if(touchedElement) unsetActiveChantElement(touchedElement);
    if(e.originalEvent.targetTouches.length !== 1) return;
    var svg = $(this).children('svg')[0];
    if(!svg) return;
    var touch = e.originalEvent.targetTouches[0];
    if(e.type == 'touchstart') {
      removeChantContextMenus();
      originalTouch = touch;
      touchedElement = findChantElementNear(svg, touch.pageX, touch.pageY);
    } else {
      // if the touch was to scroll the page, we don't want to click on the element or keep it highlighted.
      if(Math.abs(originalTouch.clientY - touch.clientY) > 10) {
        touchedElement = null;
        return;
      }
    }
    if(touchedElement) setActiveChantElement(touchedElement);
  }).on('touchend', 'div.chant-preview', function(e) {
    if(touchedElement) {
      e.preventDefault();
      $(touchedElement).click();
      touchedElement = null;
    }
  }).on('click', '[part].full use[source-index],\
[part].full text[source-index]:not(.dropCap),\
[part].full-alleluia use[source-index],\
[part].full-alleluia text[source-index]:not(.dropCap),\
[part].ordinary use[source-index],\
[part].ordinary text[source-index]:not(.dropCap)', function(e) {
    removeChantContextMenus();
    e.stopPropagation();
    var $this = $(this),
        $part = $this.parents('[part]'),
        showingGabc = $part.hasClass('show-gabc'),
        part = $part.attr('part'),
        gabcIndex = sel[part].mapExsurgeToGabc(this.source.sourceIndex);
    if(showingGabc) {
      var textarea = $part.find('textarea')[0];
      textarea.setSelectionRange(gabcIndex, gabcIndex);
      textarea.focus();
    } else {
      showToolbarForNote(this, editorialChange, {part: part});
    }
  });
  selTempus = getSeasonForMoment(new moment());
  updateTempus();
  hashChanged();
});

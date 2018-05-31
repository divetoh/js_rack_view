function jsRackView(options) {

  var elem = options.elem || document,
    evtOnSelect = options.onSelect,
    rack = options.rack || {},
    svg_width = options.width || 460,
    svg_height = options.height || 940,
    svg_scale = options.scale || 0.75,
    show_bottom_rack = true,
    show_back_rack = true,
    show_front_rack = true,
    rack_xoffset = 230,
    rack_yoffset = 133,
    rack_style = options.rack_style || 'rack42',
    scale_speed = 1.4;

  var svg_x = 50,
    svg_y = 205;

  if (options.rack_yoffset !== undefined) rack_yoffset = options.rack_yoffset;
  if (options.rack_xoffset !== undefined) rack_xoffset = options.rack_xoffset;
  if (options.show_back_rack !== undefined) show_back_rack = options.show_back_rack;
  if (options.show_bottom_rack !== undefined) show_bottom_rack = options.show_bottom_rack;
  if (options.show_front_rack !== undefined) show_front_rack = options.show_front_rack;

  var selected = {
    rid: undefined,
    uid: undefined
  },
    _mx, _my, _drag;
    
  // SVG Elements on page
  var _panel = {},
    _unit = {},
    _rack = {},
    _rackview = undefined,
    _svg = undefined;

  function parseSVG(s) {
    var div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
    var frag = document.createDocumentFragment();
    while (div.firstChild.firstChild) frag.appendChild(div.firstChild.firstChild);
    return frag;
  }

  function evt_zoom(event) {
    var rack_x = (event.offsetX - svg_x) / svg_scale;
    var rack_y = (event.offsetY - svg_y) / svg_scale;

    if (_rackview === undefined) return true;
    var d = event.deltaY;
    svg_scale = svg_scale - scale_speed * svg_scale * d / 1000;
    if (svg_scale < 0.05) svg_scale = 0.05;

    svg_x = event.offsetX - rack_x * svg_scale;
    svg_y = event.offsetY - rack_y * svg_scale;
    applyTransform();
    return false;
  }
  
  function evtMouseMove(e) {
    _drag = true;
    svg_y = svg_y - (_my - e.pageY);
    svg_x = svg_x - (_mx - e.pageX);
    _mx = e.pageX;
    _my = e.pageY;
    applyTransform();
  }

  function evtOnMouseDown(e) {
    _mx = e.pageX;
    _my = e.pageY;
    document.onmousemove = evtMouseMove;
    _svg.onmouseup = function () {
      if (!_drag) evtClick(e);
      _drag = false;
      document.onmousemove = undefined;
      _svg.onmouseup = undefined
    }
  }

  function evtClick(event) {
    var i, j, uid = -1, rid = -1;
    for (i = 0; i < event.path.length; i++) {
      if (event.path[i].classList === undefined) continue;
      for (j = 0; j < event.path[i].classList.length; j++) {
        var c = event.path[i].classList[j];
        if (c.substring(0, 5) === "unit_") {
          uid = c.split("_")[1];
          break;
        }
        if (c.substring(0, 5) === "rack_") {
          rid = c.split("_")[1];
          break;
        }
      }
      if (rid > -1) break;
    }
    if ((uid > -1) && (rid > -1)) {
      selected.rid = rid;
      selected.uid = uid;
      paintSelection();
      if (evtOnSelect!==undefined) evtOnSelect(rid, uid, rack[rid][uid]);
    }
  };
  
  function paint() {
    var svg = '<svg width="' + svg_width + '" height="' + svg_height + '" class=rackview_svg version="1.1"> \
                 <g transform="translate(' + svg_x + ', ' + svg_y + ') scale(' + svg_scale + ')" class=rackview> </g> \
               </svg>';
    elem.innerHTML = '';
    elem.appendChild(parseSVG(svg));
    _svg = elem.getElementsByClassName("rackview_svg")[0];
    _rackview = elem.getElementsByClassName("rackview")[0];
    for (var rid = 0; rid < rack.length; rid++) {
      paintRack(rid);
      paintHW(rid);
    }
    _svg.addEventListener('mousewheel', evt_zoom, true);
    _svg.onmousedown = evtOnMouseDown;
  };
  
  function paintRack(rid) {
    var rack_back_rail = '',
      rack_front_rail = '',
      rack_bottom = '';
    if (show_back_rack) rack_back_rail = rackHW[rack_style].left;
    if (show_front_rack) rack_front_rail = rackHW[rack_style].right;
    if (show_bottom_rack) rack_bottom = rackHW[rack_style].bottom;
    var svg = '<g class="rack_' + rid + ' rack" transform="translate(' + rack_xoffset * rid + ', ' + rack_yoffset * rid + ')"> \
                 <g class=rack_back>' + rack_bottom + '</g> \
                 <g class=rack_back_rail>' + rack_back_rail + '</g> \
                 <g class=rack_unit></g> \
                 <g class=rack_front_rail>' + rack_front_rail + '</g> \
                 <g class=rack_panel></g> \
               </g>';
    _rackview.appendChild(parseSVG(svg));
    _rack[rid] = elem.getElementsByClassName("rack_" + rid)[0];
    _panel[rid] = _rack[rid].getElementsByClassName("rack_panel")[0];
    _unit[rid] = _rack[rid].getElementsByClassName("rack_unit")[0];
  };
  
  function calcYOffset(uid){
    return (rackHW[rack_style].units - uid) * 20;
  }

  function paintHW(rid) {
    _panel[rid].innerHtml = '';
    _unit[rid].innerHtml = '';
    var panel = '', unit = '';
    for (var uid = 1; uid < rackHW[rack_style].units+1; uid++) {
      var rack_unit = rack[rid][uid];
      if (rack_unit == undefined) continue;
      var y = calcYOffset(uid);
      panel += '<g class=unit_' + uid + ' transform="translate(0,' + y + ')">' + rackHW[rack_unit].face + '</g>';
      unit += '<g class=unit_' + uid + ' transform="translate(0,' + y + ')">' + rackHW[rack_unit].unit + '</g>';
    }
    _panel[rid].appendChild(parseSVG(panel));
    _unit[rid].appendChild(parseSVG(unit));
    paintSelection();
  };

  function clearSelection() {
    var sel = _rackview.getElementsByClassName("selected");
    for (var i = sel.length - 1; i > -1; i--) {
      sel[i].parentNode.removeChild(sel[i]);
    }
  }

  function paintSelection() {
    clearSelection();
    var rid = selected.rid,
        uid = selected.uid;
    if ((uid === undefined)||(rid === undefined)) return;
    var y = calcYOffset(uid)
    var h_panel = parseSVG('<g class=selected transform="translate(0,' + y + ')">' + rackHW[rack[rid][uid]].sel_face + '</g>');
    var h_unit = parseSVG('<g class=selected transform="translate(0,' + y + ')">' + rackHW[rack[rid][uid]].sel_unit + '</g>');
    _panel[rid].insertBefore(h_panel, _panel[rid].getElementsByClassName("unit_" + uid)[0].nextSibling);
    _unit[rid].insertBefore(h_unit, _unit[rid].getElementsByClassName("unit_" + uid)[0].nextSibling);
  }

  function getSelected() {
    return selected;
  }

  function applyTransform() {
    _rackview.setAttribute("transform", 'translate(' + svg_x + ', ' + svg_y + ') scale(' + svg_scale + ')');
  }
  
  function fit_all() {
    var box = _rackview.getBBox();
    var scalex = svg_width / box.width;
    var scaley = svg_height / box.height;
    svg_scale = Math.min(scalex, scaley);
    svg_x = (svg_width - box.width * svg_scale) / 2 - box.x * svg_scale;
    svg_y = (svg_height - box.height * svg_scale) / 2 - box.y * svg_scale;
    applyTransform();
  }
  
  function setItem(rid, uid, item) {
    rack[rid][uid] = item;
    paint();
  }
  
  function removeItem(rid, uid, item) {
    if ((rack[rid]===undefined)||(rack[rid][uid]===undefined)) return;
    delete rack[rid][uid];
    if ((selected.rid==rid)&&(selected.uid==uid)){
      selected.rid = undefined;
      selected.uid = undefined;
      if (evtOnSelect!==undefined) evtOnSelect(undefined, undefined, undefined);
    }
    paint();
  }
   
  function select(rid, uid, item) {
    if ((rack[rid]===undefined)||(rack[rid][uid]===undefined)) return;
      selected.rid = rid;
      selected.uid = uid;
      paintSelection();
  }
 
  function save(){
    clearSelection();
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(_svg);
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    var svgData = source;
    var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
    var  svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "newesttree.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    // var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
    // document.getElementById("link").href = url;
    paintSelection();
  }

  function get_racks(){
    return rack;
  }

  function get_free_unit(rid){
    var free_units = {};
    var i=42;
    while(i>0){
      if (rack[rid][i]===undefined) {
        free_units[i] = 'whole';
        i--;
      } else {
        i = i - rackHW[rack[rid][i]].height;
      }
    }
    return free_units;
  }


  this.get_free_unit = get_free_unit;
  this.get_racks = get_racks;
  this.removeItem = removeItem;
  this.setItem = setItem;
  this.paint = paint;
  this.select = select;
  this.fit_all = fit_all;
  this.save = save;
  this.getSelected = getSelected;
  paint();

}

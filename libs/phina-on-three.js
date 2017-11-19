/*!****************************************************************************
 *                               three-text2d                                 *
 ******************************************************************************/

/*!
 * Copyright (c) 2016 Endel Dreyer
 *
 * MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var THREE_text2d = (function(t){function e(s){if(i[s])return i[s].exports;var n=i[s]={i:s,l:!1,exports:{}};return t[s].call(n.exports,n,n.exports,e),n.l=!0,n.exports}var i={};return e.m=t,e.c=i,e.i=function(t){return t},e.d=function(t,i,s){e.o(t,i)||Object.defineProperty(t,i,{configurable:!1,enumerable:!0,get:s})},e.n=function(t){var i=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(i,"a",i),i},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="",e(e.s=6)})([function(t,e){t.exports=THREE},function(t,e,i){"use strict";function s(t){var e=r[t];if(!e){var i=document.getElementsByTagName("body")[0],s=document.createElement("div"),n=document.createTextNode("MÉq");s.appendChild(n),s.setAttribute("style","font:"+t+";position:absolute;top:0;left:0"),i.appendChild(s),e=s.offsetHeight,r[t]=e,i.removeChild(s)}return e}var n=i(0);e.textAlign={center:new n.Vector2(0,0),left:new n.Vector2(1,0),topLeft:new n.Vector2(1,-1),topRight:new n.Vector2(-1,-1),right:new n.Vector2(-1,0),bottomLeft:new n.Vector2(1,1),bottomRight:new n.Vector2(-1,1)};var r={};e.getFontHeight=s},function(t,e,i){"use strict";var s=this&&this.__extends||function(t,e){function i(){this.constructor=t}for(var s in e)e.hasOwnProperty(s)&&(t[s]=e[s]);t.prototype=null===e?Object.create(e):(i.prototype=e.prototype,new i)},n=i(0),r=i(1),a=i(5),h=function(t){function e(e,i){void 0===e&&(e=""),void 0===i&&(i={});var s=t.call(this)||this;return s._font=i.font||"30px Arial",s._fillStyle=i.fillStyle||"#FFFFFF",s._shadowColor=i.shadowColor||"rgba(0, 0, 0, 0)",s._shadowBlur=i.shadowBlur||0,s._shadowOffsetX=i.shadowOffsetX||0,s._shadowOffsetY=i.shadowOffsetY||0,s.canvas=new a.CanvasText,s.align=i.align||r.textAlign.center,s.side=i.side||n.DoubleSide,s.antialias="undefined"==typeof i.antialias||i.antialias,s.text=e,s}return s(e,t),Object.defineProperty(e.prototype,"width",{get:function(){return this.canvas.textWidth},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{get:function(){return this.canvas.textHeight},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this.updateText())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"font",{get:function(){return this._font},set:function(t){this._font!==t&&(this._font=t,this.updateText())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"fillStyle",{get:function(){return this._fillStyle},set:function(t){this._fillStyle!==t&&(this._fillStyle=t,this.updateText())},enumerable:!0,configurable:!0}),e.prototype.cleanUp=function(){this.texture&&this.texture.dispose()},e.prototype.applyAntiAlias=function(){this.antialias===!1&&(this.texture.magFilter=n.NearestFilter,this.texture.minFilter=n.LinearMipMapLinearFilter)},e}(n.Object3D);e.Text2D=h},function(t,e,i){"use strict";var s=this&&this.__extends||function(t,e){function i(){this.constructor=t}for(var s in e)e.hasOwnProperty(s)&&(t[s]=e[s]);t.prototype=null===e?Object.create(e):(i.prototype=e.prototype,new i)},n=i(0),r=i(2),a=function(t){function e(e,i){return void 0===e&&(e=""),void 0===i&&(i={}),t.call(this,e,i)||this}return s(e,t),e.prototype.raycast=function(){this.mesh.raycast.apply(this.mesh,arguments)},e.prototype.updateText=function(){this.cleanUp(),this.canvas.drawText(this._text,{font:this._font,fillStyle:this._fillStyle,shadowBlur:this._shadowBlur,shadowColor:this._shadowColor,shadowOffsetX:this._shadowOffsetX,shadowOffsetY:this._shadowOffsetY}),this.texture=new n.Texture(this.canvas.canvas),this.texture.needsUpdate=!0,this.applyAntiAlias(),this.material?this.material.map=this.texture:(this.material=new n.MeshBasicMaterial({map:this.texture,side:this.side}),this.material.transparent=!0),this.mesh||(this.geometry=new n.PlaneGeometry(this.canvas.width,this.canvas.height),this.mesh=new n.Mesh(this.geometry,this.material),this.add(this.mesh)),this.mesh.position.x=this.canvas.width/2-this.canvas.textWidth/2+this.canvas.textWidth/2*this.align.x,this.mesh.position.y=-this.canvas.height/2+this.canvas.textHeight/2*this.align.y,this.geometry.vertices[0].x=this.geometry.vertices[2].x=-this.canvas.width/2,this.geometry.vertices[1].x=this.geometry.vertices[3].x=this.canvas.width/2,this.geometry.vertices[0].y=this.geometry.vertices[1].y=this.canvas.height/2,this.geometry.vertices[2].y=this.geometry.vertices[3].y=-this.canvas.height/2,this.geometry.verticesNeedUpdate=!0},e}(r.Text2D);e.MeshText2D=a},function(t,e,i){"use strict";var s=this&&this.__extends||function(t,e){function i(){this.constructor=t}for(var s in e)e.hasOwnProperty(s)&&(t[s]=e[s]);t.prototype=null===e?Object.create(e):(i.prototype=e.prototype,new i)},n=i(0),r=i(2),a=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return s(e,t),e.prototype.raycast=function(){return this.sprite.raycast.apply(this.sprite,arguments)},e.prototype.updateText=function(){this.canvas.drawText(this._text,{font:this._font,fillStyle:this._fillStyle}),this.cleanUp(),this.texture=new n.Texture(this.canvas.canvas),this.texture.needsUpdate=!0,this.applyAntiAlias(),this.material?this.material.map=this.texture:this.material=new n.SpriteMaterial({map:this.texture}),this.sprite||(this.sprite=new n.Sprite(this.material),this.geometry=this.sprite.geometry,this.add(this.sprite)),this.sprite.scale.set(this.canvas.width,this.canvas.height,1),this.sprite.position.x=this.canvas.width/2-this.canvas.textWidth/2+this.canvas.textWidth/2*this.align.x,this.sprite.position.y=-this.canvas.height/2+this.canvas.textHeight/2*this.align.y},e}(r.Text2D);e.SpriteText2D=a},function(t,e,i){"use strict";var s=i(0),n=i(1),r=function(){function t(){this.textWidth=null,this.textHeight=null,this.canvas=document.createElement("canvas"),this.ctx=this.canvas.getContext("2d")}return Object.defineProperty(t.prototype,"width",{get:function(){return this.canvas.width},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"height",{get:function(){return this.canvas.height},enumerable:!0,configurable:!0}),t.prototype.drawText=function(t,e){return this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.font=e.font,this.textWidth=Math.ceil(this.ctx.measureText(t).width),this.textHeight=n.getFontHeight(this.ctx.font),this.canvas.width=s.Math.nextPowerOfTwo(this.textWidth),this.canvas.height=s.Math.nextPowerOfTwo(this.textHeight),this.ctx.font=e.font,this.ctx.fillStyle=e.fillStyle,this.ctx.textAlign="left",this.ctx.textBaseline="top",this.ctx.shadowColor=e.shadowColor,this.ctx.shadowBlur=e.shadowBlur,this.ctx.shadowOffsetX=e.shadowOffsetX,this.ctx.shadowOffsetY=e.shadowOffsetY,this.ctx.fillText(t,0,0),this.canvas},t}();e.CanvasText=r},function(t,e,i){"use strict";var s=i(4);e.SpriteText2D=s.SpriteText2D;var n=i(3);e.MeshText2D=n.MeshText2D;var r=i(1);e.textAlign=r.textAlign}]);

/*!****************************************************************************
 *                              END three-text2d                              *
 ******************************************************************************/

phina.define('phina.display.ThreeApp', {
  superClass: 'phina.display.DomApp',
  init: function(options) {
    options = (options || {}).$safe(phina.display.CanvasApp.defaults);

    if (!options.query && !options.domElement) {
      this.renderer = new THREE.WebGLRenderer({antialias: true});
      options.domElement = this.renderer.domElement;
      if (options.append) document.body.appendChild(options.domElement);
    }
    if(!options.runner && phina.isAndroid()) options.runner = phina.global.requestAnimationFrame;
    this.superInit(options);
    if (!this.renderer) this.renderer = new THREE.WebGLRenderer({antialias: true, canvas: this.domElement});
    this.renderer.setSize(options.width, options.height);

    this.scene = new THREE.Scene();

    this.renderer.setPixelRatio(devicePixelRatio);

    this.camera = new THREE.OrthographicCamera(0, options.width, 0, -options.height, 1, 10000);
    this.camera.position.z = 5;

    this.gridX = phina.util.Grid({
      width: options.width,
      columns: options.columns,
    });
    this.gridY = phina.util.Grid({
      width: options.height,
      columns: options.columns,
    });

    this.backgroundColor = (options.backgroundColor !== undefined) ? options.backgroundColor : 'white';

    if (options.fit) this.fitScreen();

    this.on('changescene', function() {
      this.currentScene.children.each(function(child) {
        this.scene.remove(child.mesh);
      }, this);
    });
  },
  _draw: function() {
    this.renderer.setClearColor(new THREE.Color(this.currentScene.backgroundColor || this.backgroundColor), 1);

    var updateObject = function(obj) {

      obj._calcWorldMatrix && obj._calcWorldMatrix();

      if (!obj.visible) {
        if (obj.mesh) (obj.parent === this.currentScene ? this.scene : obj.parent.mesh).remove(obj.mesh);
        return;
      }

      if (!obj.mesh) {
        (function recurse(o) {
          if (o.initThreeMesh) {
            o.mesh = o.initThreeMesh();
          } else o.mesh = new THREE.Group();
          o.mesh.initialQuaternion = o.mesh.quaternion.clone();

          if (o.parent === this.currentScene) {
            this.scene.add(o.mesh);
          } else {
            if (!o.parent.mesh) recurse(o.parent);
            o.parent.mesh.add(o.mesh);
          }

          o.on('removed', function() {
            o.mesh.parent && o.mesh.parent.remove(o.mesh);
          });
        }.bind(this))(obj);
      } else if (!obj.mesh.parent) (obj.parent === this.currentScene ? this.scene : obj.parent.mesh).add(obj.mesh);

      obj._calcWorldAlpha && obj._calcWorldAlpha();
      obj.updateThreeMesh && obj.updateThreeMesh(obj.mesh, obj._worldAlpha, this);
      if (obj.mesh.material) {
        obj.mesh.material.transparent = obj.className === "phina.display.Label" || obj._worldAlpha !== 1;
        obj.mesh.material.opacity = obj._worldAlpha;
      }
      obj.mesh.quaternion.copy(obj.mesh.initialQuaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.degToRad(-obj.rotation))));

      obj.mesh.position.set(obj.x - obj.width * (obj.origin.x - 0.5), -obj.y + obj.height * (obj.origin.y - 0.5), 0);

      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        var tempChildren = obj.children.slice();
        for (var i=0,len=tempChildren.length; i<len; ++i) {
          updateObject(tempChildren[i]);
        }
      }
    }.bind(this);

    if (this.currentScene.children.length > 0) {
      var tempChildren = this.currentScene.children.slice();
      for (var i=0,len=tempChildren.length; i<len; ++i) {
        updateObject(tempChildren[i]);
      }
    }

    this.render();
  },
  render: function() {
    this.renderer.render(this.scene, this.camera);
  },
  fitScreen: function() {
    var _fitFunc = function() {
      var e = this.domElement;
      var s = e.style;

      s.position = "absolute";
      s.margin = "auto";
      s.left = "0";
      s.top  = "0";
      s.bottom = "0";
      s.right = "0";

      var rate = this.height / this.width;

      if (window.innerHeight / window.innerWidth > rate) {
        var width  = Math.floor(window.innerWidth);
        var height = Math.floor(window.innerWidth*rate);
      } else {
        var width  = Math.floor(window.innerHeight/rate);
        var height = Math.floor(window.innerHeight);
      }
      this.renderer.setSize(width, height);
    }.bind(this);

    // 一度実行しておく
    _fitFunc();

    // リサイズ時のリスナとして登録しておく
    phina.global.addEventListener("resize", _fitFunc, false);
  },
});

phina.namespace(function() {
  function setColor(material, str, opacity) {
    if (!str) {
      material.visible = false;
      return;
    }
    var color = phina.util.Color().setFromString(str);
    if (!color.a) {
      material.visible = false;
      return;
    }
    material.color = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
    color.a *= opacity !== undefined ? opacity : 1;
    material.opacity = color.a;
    material.transparent = color.a !== 1;
    material.visible = true;
  }

  phina.display.RectangleShape.prototype.$extend({
    initThreeMesh: function() {
      var group = new THREE.Group();
      var geometry = new THREE.PlaneBufferGeometry(1, 1);
      group.fill = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({side: THREE.DoubleSide})
      );
      group.fill.position.z = 1;
      group.stroke = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial()
      );
      group.add(group.stroke);
      group.add(group.fill);
      return group;
    },
    updateThreeMesh: function(group, alpha) {
      setColor(group.fill.material, this.fill, alpha);
      group.fill.scale.set(this.width * this.scaleX, this.height * this.scaleY, 1);
      setColor(group.stroke.material, this.stroke, alpha);
      group.stroke.scale.set((1 + this.strokeWidth / this.width) * this.width * this.scaleX, (1 +   this.strokeWidth / this.height) * this.height * this.scaleY, 1);
    }
  });

  phina.display.CircleShape.prototype.$extend({
    initThreeMesh: function() {
      var group = new THREE.Group();
      var geometry = new THREE.CircleBufferGeometry(1, 128);
      group.fill = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({side: THREE.DoubleSide})
      );
      group.fill.position.z = 1;
      group.stroke = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial()
      );
      group.add(group.stroke);
      group.add(group.fill);
      return group;
    },
    updateThreeMesh: function(group, alpha) {
      setColor(group.fill.material, this.fill, alpha);
      group.fill.scale.set(this.radius * this.scaleX, this.radius * this.scaleY, 1);
      setColor(group.stroke.material, this.stroke, alpha);
      var w = 1 + this.strokeWidth / this.radius / 2;
      group.stroke.scale.set(w * this.radius * this.scaleX, w * this.radius * this.scaleY, 1);
    }
  });

  phina.display.Label.prototype.$extend({
    initThreeMesh: function() {
      return new THREE_text2d.MeshText2D(this.text || " ", {
        align: THREE_text2d.textAlign[this.align].clone().add(new THREE.Vector2(0, 0.5)),
        font: this.font,
        fillStyle: this.fill
      });
    },
    updateThreeMesh: function(mesh) {
      mesh.align = THREE_text2d.textAlign[this.align].clone().add(new THREE.Vector2(0, 0.5));
      mesh.text = this.text || " ";
      mesh.font = this.font;
      mesh.fillStyle = this.fill;
      mesh.scale.set(this.scaleX, this.scaleY, 1);
    }
  });

  phina.display.ThreeLayer.prototype.$extend({
    initThreeMesh: function() {
      this.renderTarget = new THREE.WebGLRenderTarget(this.width * this.scaleX * devicePixelRatio, this.height * this.scaleY * devicePixelRatio, {});
      return new THREE.Mesh(
        new THREE.PlaneBufferGeometry(1, 1),
        new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide, map:   this.renderTarget.texture})
      );
    },
    updateThreeMesh: function(mesh, _, app) {
      var tmpClearColor = app.renderer.getClearColor();
      app.renderer.setClearColor(this.renderer.getClearColor());
      app.renderer.render(this.scene, this.camera, this.renderTarget);
      app.renderer.setClearColor(tmpClearColor);
      mesh.scale.set(this.width * this.scaleX, this.height * this.scaleY, 1);
    }
  });

  phina.ui.Gauge.prototype.$extend({
    initThreeMesh: function() {
      var group = new THREE.Group();
      var geometry = new THREE.PlaneBufferGeometry(1, 1);
      group.fill = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({side: THREE.DoubleSide})
      );
      group.fill.position.z = 1;
      group.stroke = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial()
      );
      group.gauge = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial()
      );
      group.gauge.position.z = 2;
      group.add(group.stroke);
      group.add(group.fill);
      group.add(group.gauge);
      return group;
    },
    updateThreeMesh: function(group, alpha) {
      setColor(group.fill.material, this.fill, alpha);
      group.fill.scale.set(this.width * this.scaleX, this.height * this.scaleY, 1);
      setColor(group.stroke.material, this.stroke, alpha);
      group.stroke.scale.set((1 + this.strokeWidth / this.width) * this.width * this.scaleX, (1 +   this.strokeWidth / this.height) * this.height * this.scaleY, 1);
      setColor(group.gauge.material, this.gaugeColor, alpha);
      group.gauge.scale.set(this.width * this.scaleX * this.getRate(), this.height * this.scaleY, 1);
    }
  });
});


phina.define('phina.display.ThreeScene', {
  superClass: 'phina.app.Scene',

  init: function(params) {
    this.superInit();

    params = ({}).$safe(params, phina.display.DisplayScene.defaults);

    this.width = params.width;
    this.height = params.height;
    this.gridX = phina.util.Grid(params.width, 16);
    this.gridY = phina.util.Grid(params.height, 16);
    this.backgroundColor = (params.backgroundColor) ? params.backgroundColor : null;

    // TODO: 一旦むりやり対応
    this.interactive = true;
    this.setInteractive = function(flag) {
      this.interactive = flag;
    };
    this._overFlags = {};
    this._touchFlags = {};
  },

  hitTest: function() {
    return true;
  }

});

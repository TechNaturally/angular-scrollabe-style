angular.module('angular-scrollable-style', [])
.controller('ScrollableStyleController', ['$scope', '$window', function($scope, $window){
	var self = this;
	var windowElem = angular.element($window);
	var scrollWatched, lastScroll, lastScrollDelta;
	self.enabled;
	self.defaultConfig = {
		delay: 0,
		delta: 0
	};

	var origCss = {};
	var propState = {};
	var PROP_STATES = {
		DEFAULT: 0,
		APPLYING: 1,
		APPLIED: 2,
		RESETTING: 3
	};
	var PROP_STATE_TICK_SETTING = {};
	PROP_STATE_TICK_SETTING[ PROP_STATES.DEFAULT ]   = 'delay.on';
	PROP_STATE_TICK_SETTING[ PROP_STATES.APPLYING ]  = 'delta.on';
	PROP_STATE_TICK_SETTING[ PROP_STATES.APPLIED ]   = 'delay.off';
	PROP_STATE_TICK_SETTING[ PROP_STATES.RESETTING ] = 'delta.off';

	function getPropConfigValue(prop, opt){
		var subOpt;
		if(opt.substr(-3) == '.on'){
			opt = opt.substr(0, opt.length-3);
			subOpt = 'on';
		}
		else if(opt.substr(-4) == '.off'){
			opt = opt.substr(0, opt.length-4);
			subOpt = 'off';
		}

		var debug = self.$element.hasClass('debug-val');
		if(debug){
			console.log('--- getPropConfig ['+prop+'] -> |'+opt+'|('+subOpt+')');
			console.log(' --- with style['+prop+']: '+angular.toJson(self.style[prop]));
			console.log(' --- with styleConfig: '+angular.toJson(self.styleConfig));
			console.log(' --- and defaultConfig: '+angular.toJson(self.defaultConfig));
		}

		var value;
		if(prop && opt && self.style && angular.isDefined(self.style[prop]) && angular.isDefined(self.style[prop][opt])){
			value = self.style[prop][opt];
		}
		if(angular.isUndefined(value) && opt && self.styleConfig && angular.isDefined(self.styleConfig[opt])){
			value = self.styleConfig[opt];
		}
		if(angular.isUndefined(value) && opt && self.defaultConfig && angular.isDefined(self.defaultConfig[opt])){
			value = self.defaultConfig[opt];
		}

		if(subOpt && angular.isObject(value) && angular.isDefined(value[subOpt])){
			value = value[subOpt];
		}

		if(debug){
			console.log(' --=> '+value);
		}

		return value;
	}
	function getPropConfig(prop, opt){
		var value = getPropConfigValue(prop, opt);

		var debug = false; //self.$element.hasClass('debug');

		var isAbsolute = false;
		if(angular.isString(value) && value.charAt(0) == '@'){
			isAbsolute = true;
			value = value.substr(1);
		}

		if(angular.isString(value) && value.substr(-1) == '%'){
			value = parseFloat(value) / 100.0 * getScrollHeight();
		}

		if(debug){
			console.log('--- getPropConfig ['+prop+'] -> |'+opt+'|('+subOpt+') => '+value);
		}

		return parseFloat(value);
	}
	function isPropConfigAbsolute(prop, opt){
		var value = getPropConfigValue(prop, opt);
		
		var isAbsolute = false;
		if(angular.isString(value) && value.charAt(0) == '@'){
			isAbsolute = true;
			value = value.substr(1);
		}
		return isAbsolute;
	}
	

	function parseCssValue(cssValue){
		var value = cssValue;
		var unit;
		//var debug = self.$element.hasClass('debug');

		if(angular.isString(cssValue)){
			if(cssValue.substr(0, 4)=='rgb(' || cssValue.substr(0, 5)=='rgba('){
				var rgbMatch = /rgba?\(\s?([\d\.]+)\s?,\s?([\d\.]+)\s?,\s?([\d\.]+)\s?(,\s?([\d\.]+)\s?)?\)/.exec(cssValue);
				value = [ (angular.isDefined(rgbMatch[1])?parseFloat(rgbMatch[1]):0.0), (angular.isDefined(rgbMatch[2])?parseFloat(rgbMatch[2]):0.0), (angular.isDefined(rgbMatch[3])?parseFloat(rgbMatch[3]):0.0), (angular.isDefined(rgbMatch[5])?parseFloat(rgbMatch[5]):1.0) ];
				unit = 'rgba';
			}
			else if(cssValue.charAt(0)=='#' && /^#([A-Fa-f0-9]{3}){1,2}$/.test(cssValue)){
				var hex = cssValue.substring(1).split('');
				if(hex.length==3){
					hex = [hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]];
				}
				hex = '0x'+hex.join('');
				value = [ (hex>>16)&255, (hex>>8)&255, hex&255, 1.0 ];
				unit = 'rgba';
			}
			else{
				value = parseFloat(cssValue);
				unit = cssValue.replace(''+value, '');
			}
		}
		return { value: value, unit: unit };
	}

	self.applyStyle = function(prop, percent){
		var debug = self.$element.hasClass('debug');
		if(debug){
			console.log('      ~~% applyStyle ['+prop+'] @ '+(percent*100.0).toFixed(3)+'%');
		}

		if(percent < 0.0){
			percent = 0.0;
		}
		else if(percent > 1.0){
			percent = 1.0;
		}

		if(prop && self.style && self.style[prop]){
			var propStyle = self.style[prop];
			if(angular.isDefined(propStyle.init) && angular.isDefined(propStyle.apply)){
				var start = parseCssValue(propStyle.init);
				var finish = parseCssValue(propStyle.apply);

				if(debug){
					console.log('       ~~% '+angular.toJson(start)+' -> '+angular.toJson(finish)+' ('+angular.toJson(propStyle.init)+' -> '+angular.toJson(propStyle.apply)+')');
				}

				if(start && finish && start.unit == finish.unit){
					var value;
					if(start.unit == 'rgba'){
						value = [];
						for(var i=0; i < 4; i++){
							value.push( Math.round(start.value[i] + (finish.value[i]-start.value[i])*percent) );
						}
						value = 'rgba('+value.join(',')+')';
					}
					else{
						value = (start.value + (finish.value-start.value)*percent);
						if(start.unit){
							value += start.unit;
						}
						if(debug){
							console.log('       ~~@ '+value); //+' ['+((start.value + (finish.value-start.value)*percent))+']');
						}
					}

					setCss(prop, value);
				}
				else{
					throw new Error('Invalid CSS value pair: "'+propStyle.init+'" and "'+propStyle.apply+'"');
				}
			}
		}

		
		/**
		if(self.style && prop && self.style[prop]){
			var propStyle = self.style[prop];
			if(angular.isDefined(propStyle.start) && angular.isDefined(propStyle.end)){
				var propDelta = angular.isDefined(propStyle.delta) ? propStyle.delta : self.defaultDelta;
				var percent = 0.0;
				if(propDelta){
					percent = delta / propDelta;
				}
				else if(delta > 0){
					percent = 1.0;
				}

				if(percent > 1){
					percent = 1.0;
				}
				else if(percent < 0){
					percent = 0;
				}

				var start = parseFloat(propStyle.start);
				var end = parseFloat(propStyle.end);
				var unit = '';
				if(angular.isString(propStyle.start)){
					unit = propStyle.start.replace(''+start, '');
				}
				var amount = (end - start);				
				setCss(prop, (start + (amount*percent))+unit);
			}
		}
		*/
	};
	self.initStyle = function(){
		if(self.style){
			for(var prop in self.style){
				if(!self.style[prop]){
					continue;
				}

				// reset state
				if(angular.isUndefined(propState[prop])){
					propState[prop] = {
						state: PROP_STATES.DEFAULT,
						ticks: 0
					};
				}
				else{
					propState[prop].state = PROP_STATES.DEFAULT;
					propState[prop].ticks = 0;
				}

				// init style
				self.applyStyle(prop, 0.0);
			}
		}
	};

	function handlePropState(prop, scrollDelta, scrollY, scrollHeight){
		var debug = self.$element.hasClass('debug');

		if(propState[prop]){
			var tickSetting = PROP_STATE_TICK_SETTING[ propState[prop].state ];
			var absolute = isPropConfigAbsolute(prop, tickSetting);
			var targetTick = getPropConfig(prop, tickSetting);

			var checkTick = absolute ? scrollY : propState[prop].ticks;

			if(debug){
				console.log(' ++['+prop+'] => '+angular.toJson(propState[prop]));
			}

			if(propState[prop].state == PROP_STATES.DEFAULT){
				// waiting to apply

				if(debug){
					console.log('   --@ WAITING @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'%    ['+tickSetting+']');
				}

				if(checkTick >= targetTick || scrollY >= scrollHeight){
					propState[prop].state = PROP_STATES.APPLYING;
					propState[prop].ticks = (checkTick - targetTick);
					if(propState[prop].ticks < 0){
						propState[prop].ticks = 0;
					}

					if(debug){
						console.log('  **-@ WAITING =-> APPLYING @-**');
					}

					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}

			}
			else if(propState[prop].state == PROP_STATES.APPLYING){
				// applying style

				if(absolute){
					checkTick = propState[prop].ticks;
					if(debug){
						console.log('    -@ TARGET TICK => '+targetTick+' - ('+scrollY+' - '+propState[prop].ticks+') == ('+(targetTick - (scrollY - propState[prop].ticks))+')');
					}
					targetTick -= (scrollY - propState[prop].ticks);
				}

				if(debug){
					console.log('   --@ APPLYING @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'%    ['+tickSetting+']');
				}

				if(!targetTick || checkTick >= targetTick || scrollY >= scrollHeight){
					// finished applying
					self.applyStyle(prop, 1.0);

					// advance to APPLIED state
					propState[prop].state = PROP_STATES.APPLIED;
					propState[prop].ticks = (targetTick ? (checkTick - targetTick) : scrollDelta);
					if(propState[prop].ticks < 0){
						propState[prop].ticks = 0;
					}

					if(debug){
						console.log('  **-@ APPLYING =-> APPLIED @-**');
					}

					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
				else if(propState[prop].ticks < 0 || scrollY <= 0){
					// cancelled applying
					self.applyStyle(prop, 0.0);

					if(getPropConfig(prop, PROP_STATE_TICK_SETTING[ PROP_STATES.DEFAULT ])){
						// regress to DEFAULT/WAITING state
						propState[prop].state = PROP_STATES.DEFAULT;
						propState[prop].ticks = 0;


						if(debug){
							console.log('  **-@ DEFAULT <-= APPLYING @-** ('+getPropConfig(prop, PROP_STATE_TICK_SETTING[ PROP_STATES.DEFAULT ])+')');
						}

						handlePropState(prop, scrollDelta, scrollY, scrollHeight);
					}
				}
				else {
					// applying state
					self.applyStyle(prop, checkTick / targetTick);
				}
				
			}
			else if(propState[prop].state == PROP_STATES.APPLIED){
				// style applied (waiting to reset)
				if(absolute){
					checkTick -= scrollHeight;
					targetTick = scrollHeight - targetTick;
				}
				checkTick *= -1.0;

				if(debug){
					console.log('   --@ APPLIED @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'%    ['+tickSetting+']');
				}

				if(checkTick >= targetTick || scrollY <= 0){
					// advance to RESETTING state
					propState[prop].state = PROP_STATES.RESETTING;
					propState[prop].ticks = (targetTick - checkTick);
					if(propState[prop].ticks > 0){
						propState[prop].ticks = 0;
					}

					if(debug){
						console.log('  **-@ APPLIED =-> RESETTING @-**');
					}

					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
			}
			else if(propState[prop].state == PROP_STATES.RESETTING){
				if(absolute){
					checkTick = propState[prop].ticks;
					if(debug){
						console.log('    -@ TARGET TICK => ('+scrollY+' - '+propState[prop].ticks+') - '+targetTick+' == ('+((scrollY - propState[prop].ticks) - targetTick)+')');
					}
					targetTick = (scrollY - propState[prop].ticks) - targetTick;
				}
				checkTick *= -1.0;

				if(debug){
					console.log('   --@ RESETTING @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'%    ['+tickSetting+']');
				}

				if(!targetTick || checkTick >= targetTick || scrollY <= 0){
					// finished applying
					self.applyStyle(prop, 0.0);

					// reset to DEFAULT/WAITING state
					propState[prop].state = PROP_STATES.DEFAULT;
					propState[prop].ticks = (targetTick ? (targetTick - checkTick) : scrollDelta);
					if(propState[prop].ticks > 0){
						propState[prop].ticks = 0;
					}

					if(debug){
						console.log('  **-@ RESETTING =-> WAITING @-**');
					}

					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
				else if(propState[prop].ticks > 0 || scrollY >= scrollHeight){
					// cancelled RESETTING
					self.applyStyle(prop, 1.0);

					if(scrollY < scrollHeight && getPropConfig(prop, PROP_STATE_TICK_SETTING[ PROP_STATES.APPLIED ])){
						// regress to APPLIED state
						propState[prop].state = PROP_STATES.APPLIED;
						propState[prop].ticks = 0;

						if(debug){
							console.log('  **-@ APPLIED <-= RESETTING @-**');
						}

						handlePropState(prop, scrollDelta, scrollY, scrollHeight);
					}
				}
				else {
					// RESETTING state
					self.applyStyle(prop, 1.0 - (checkTick / targetTick));
				}
			}
		}

	}

	self.handleScroll = function(scrollDelta, scrollY, scrollHeight){
		var directionChanged = false;
		if(angular.isDefined(lastScrollDelta)){
			directionChanged = ( (lastScrollDelta < 0 && scrollDelta > 0) || (lastScrollDelta >= 0 && scrollDelta < 0) );
		}

		var scrollPercent = (scrollY / scrollHeight);

		var debug = self.$element.hasClass('debug');
		if(debug){
			//['+self.$element[0].className+']
			console.log('ng-scrollable-style: handleScroll ... @ '+scrollY+' / '+scrollHeight+' | '+(scrollPercent*100.0).toFixed(2)+'%  ('+scrollDelta+')');
			if(directionChanged){
				console.log(' *** DIRECTION CHANGED ***');
			}
		}

		var debug1 = self.$element.hasClass('debug1');
		if(debug1){
			console.log('ng-scrollable-style: handleScroll @ '+(scrollPercent*100.0)+'% ...');
		}

		if(self.style){
			for(var prop in self.style){
				if(!self.style[prop]){
					continue;
				}
				// assert a state tracker for this property
				if(angular.isUndefined(propState[prop])){
					propState[prop] = {
						state: PROP_STATES.DEFAULT,
						ticks: 0
					};
				}

				/** How the scroll-ticks are counted per state:
				 * propState.DEFAULT.ticks - counter of ticks in a continuous direction (resets on direction change)
				 * propState.APPLYING.ticks - continuous counter of position in transition (+/- with direction)
				 * propState.APPLIED.ticks - counter of ticks in a continuous direction (resets on direction change)
				 * propState.RESETTING.ticks - continuous counter of position in transition (+/- with direction)
				 **/

				// reset tick counter on scroll direction change during DEFAULT and APPLIED states
				if(directionChanged && (propState[prop].state == PROP_STATES.DEFAULT || propState[prop].state == PROP_STATES.APPLIED)){
					// reset tick counter when the scroll direction changes
					propState[prop].ticks = 0;
				}
				propState[prop].ticks += scrollDelta;

				handlePropState(prop, scrollDelta, scrollY, scrollHeight);



/**
				if(propState[prop].state == PROP_STATES.DEFAULT){
					// waiting to apply
					var absolute = isPropConfigAbsolute(prop, 'delay.on');
					var targetTick = getPropConfig(prop, 'delay.on');

					var checkTick = absolute ? scrollY : propState[prop].ticks;

					if(debug){
						console.log('   --@ WAITING @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'    [delay.on]');
					}

					//if((!absolute && propState[prop].ticks >= delay) || (absolute && scrollY >= delay)){
					if(checkTick >= targetTick){
						propState[prop].state = PROP_STATES.APPLYING;
						propState[prop].ticks = (checkTick - targetTick);

						if(debug){
							console.log('  **-@ WAITING -> APPLYING @-**');
							console.log('  +['+prop+'] => '+angular.toJson(propState[prop]));
						}
					}
				}
*/
				
				/**
				if(propState[prop].state == PROP_STATES.APPLYING){
					// applying
					var absolute = isPropConfigAbsolute(prop, 'delta.on');
					var targetTick = getPropConfig(prop, 'delta.on');

					var checkTick = absolute ? scrollY : propState[prop].ticks;
					

					if(debug){
						console.log('   --@ APPLYING @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'    [delta.on]');
					}

					//if((!absolute && (!delta || propState[prop].ticks >= delta)) || (absolute && scrollY >= delta)){
					if(!targetTick || checkTick >= targetTick){
						// finished applying
						self.applyStyle(prop, 1.0);
						propState[prop].state = PROP_STATES.APPLIED;
						propState[prop].ticks = (targetTick ? (checkTick - targetTick) : scrollDelta);
						if(propState[prop].ticks < 0){
							propState[prop].ticks = 0;
						}
						if(debug){
							console.log('  **-@ APPLYING -> APPLIED @-**');
							console.log('  +['+prop+'] => '+angular.toJson(propState[prop]));
						}
					}
					else if(propState[prop].ticks < 0){
						// cancelled applying, regress to waiting stage
						self.applyStyle(prop, 0.0);
						propState[prop].state = PROP_STATES.DEFAULT;
						propState[prop].ticks = 0;


//						propState[prop].ticks += getPropConfig(prop, 'delay.on');
//						if(propState[prop].ticks < 0){
//							propState[prop].ticks = 0;
//						}

						if(debug){
							console.log('  **** DEFAULT (regression) ***');
							console.log('  +['+prop+'] => '+angular.toJson(propState[prop]));
						}
					}
					else {
						self.applyStyle(prop, checkTick / targetTick);
					}
				}
				*/

/**
				if(propState[prop].state == PROP_STATES.APPLIED){
					var absolute = isPropConfigAbsolute(prop, 'delay.off');
					var targetTick = getPropConfig(prop, 'delay.off');

					var checkTick = absolute ? scrollY : propState[prop].ticks;
					
					if(debug){
						console.log('   --@ APPLIED @ '+checkTick+' / '+(absolute?'@':'')+targetTick+' | '+(checkTick/targetTick*100.0).toFixed(2)+'    [delay.off]');
					}
					if((!absolute && propState[prop].ticks <= -delay) || (absolute && scrollY <= delay)){
						propState[prop].state = PROP_STATES.RESETTING;
						propState[prop].ticks += delay;
						if(debug){
							console.log('  **** RESETTING! ***');
							console.log('  +['+prop+'] => '+angular.toJson(propState[prop]));
						}
					}
				}
				*/
/**
				if(propState[prop].state == PROP_STATES.RESETTING){
					var delta = getPropConfig(prop, 'delta.off');
					var absolute = isPropConfigAbsolute(prop, 'delta.off');
					if(debug){
						console.log('    -@ resetting -> delta.off: '+(absolute?'@':'')+delta);
					}
					if((!absolute && (!delta || propState[prop].ticks <= -delta)) || (absolute && scrollY <= delta)){
						self.applyStyle(prop, 0.0);
						propState[prop].state = PROP_STATES.DEFAULT;
						propState[prop].ticks = 0;
						if(debug){
							console.log('  **** RESET/DEFAULT! ***');
							console.log('  +['+prop+'] => '+angular.toJson(propState[prop]));
						}
					}
					else {
						if(absolute){
							self.applyStyle(prop, 1.0 - (scrollY / delta));
						}
						else{
							self.applyStyle(prop, 1.0 - (propState[prop].ticks / delta));
						}
					}
				}
*/
				

				/**
				var propDelay = angular.isDefined(self.style[prop].delay) ? self.style[prop].delay : self.defaultDelay;
				var propDelta = angular.isDefined(self.style[prop].delta) ? self.style[prop].delta : self.defaultDelta;
				var propActivated = false;
				if(angular.isUndefined(propState[prop])){
					propState[prop] = {active: false, activeTick: 0};
				}
				console.log('ng-scrollable-style: ['+self.$element[0].className+'] handleScroll -> ['+prop+'] ', delta, scrollY, angular.toJson(propState[prop]));
				if(!propState[prop].active){
					propState[prop].activeTick += delta;
					if(propState[prop].activeTick < 0){
						propState[prop].activeTick = 0;
					}
					if(propState[prop].activeTick >= propDelay){
						propState[prop].active = true;
						propActivated = true; // local tracking so it doesn't deactivate right away
						delta = propState[prop].activeTick - propDelay;
						propState[prop].activeTick = 0;
					}
				}
				if(propState[prop].active){
					propState[prop].activeTick += delta;
					if(propState[prop].activeTick > propDelta){
						propState[prop].activeTick = propDelta || 1.0;
					}
					if(propState[prop].activeTick <= 0 && !propActivated){
						propState[prop].active = false;
						propState[prop].activeTick = 0;
					}
					self.applyStyle(prop, propState[prop].activeTick);
				}
				*/
			}
			if(debug){
				console.log("''''''''''''");
			}
		}
		lastScrollDelta = scrollDelta;
	};

	function initElement(){
		if(self.$element){
			self.$element.addClass('scrollable-style');
			origCss = {};
			if(self.initialized){
				self.initStyle();
			}
		}
	}
	function setCss(prop, value){
		if(self.$element){
			if(angular.isUndefined(origCss[prop])){
				origCss[prop] = self.$element[0].style[prop];
			}
			self.$element.css(prop, value);
		}
	}

	function resetCss(){
		if(self.$element){
			for(var prop in origCss){
				self.$element.css(prop, origCss[prop]);
			}
		}
	}
	function resetElement(){
		if(self.$element){
			resetCss();
			self.$element.removeClass('scrollable-style');
		}
	}
	function resetPropStates(){
		propState = {};
	}

	function getScrollHeight(){
		return Math.max( document.body.scrollHeight,
						 document.body.offsetHeight,
						 document.documentElement.clientHeight,
						 document.documentElement.scrollHeight,
						 document.documentElement.offsetHeight
						) - $window.innerHeight;
	}
	function scrolled(event){
		var scrollDistance = 0;
		if(angular.isDefined(lastScroll)){
			scrollDistance = $window.scrollY - lastScroll;
		}
		lastScroll = $window.scrollY;
		self.handleScroll(scrollDistance, $window.scrollY, getScrollHeight());
	}
	function initScrollWatch(){
		if(!scrollWatched){
			windowElem.on('scroll', scrolled);
			scrollWatched = true;
			lastScroll = $window.scrollY;
		}
	}
	function removeScrollWatch(){
		if(scrollWatched){
			windowElem.off('scroll', scrolled);
			scrollWatched = undefined;
			lastScroll = undefined;
		}
	}

	self.setScrollableStyle = function(style){
		self.styleConfig = {
			delay: (angular.isDefined(style.delay) ? style.delay : undefined),
			delta: (angular.isDefined(style.delta) ? style.delta : undefined)
		};
		if(angular.isDefined(style.delay)){
			style.delay = undefined;
		}
		if(angular.isDefined(style.delta)){
			style.delta = undefined;
		}
		self.style = style;
	};
	self.setDefaultDelay = function(delay){
		if(!delay){
			delay = 0;
		}
		self.defaultConfig.delay = delay;
	};
	self.setDefaultDelta = function(delta){
		if(!delta){
			delta = 0;
		}
		self.defaultConfig.delta = delta;
	};
	self.setElement = function(element){
		resetElement();
		self.$element = element;
		initElement();
	};
	self.setEnabled = function(enable){
		if(angular.isUndefined(enable)){
			enable = true;
		}
		if(enable && !self.enabled){
			self.enabled = enable;
			initElement();
			initScrollWatch();
		}
		else if(!enable && self.enabled){
			self.enabled = enable;
			self.destroy();
		}
	};

	self.setInitialized = function(initialized){
		self.initialized = initialized;
		if(self.initialized){
			self.initStyle();
		}
	};

	self.destroy = function(){
		resetElement();
		resetPropStates();
		removeScrollWatch();
	};
}])
.directive('ngScrollableStyle', [function(){
	return {
		restrict: 'A',
		require: 'ngScrollableStyle',
		controller: 'ScrollableStyleController',
		link: function(scope, elem, attr, Ctrl){
			function init(){
				setStyleOnChild(attr['ngScrollableStyleOnChild']);
				attr.$observe('ngScrollableStyleOnChild', setStyleOnChild);

				setScrollableStyle(attr['ngScrollableStyle']);
				attr.$observe('ngScrollableStyle', setScrollableStyle);

				setEnabled(attr['ngScrollableStyleEnabled']);
				attr.$observe('ngScrollableStyleEnabled', setEnabled);

				setDelay(attr['ngScrollableStyleDelay']);
				attr.$observe('ngScrollableStyleDelay', setDelay);

				setDelta(attr['ngScrollableStyleDelta']);
				attr.$observe('ngScrollableStyleDelta', setDelta);

				Ctrl.setInitialized(true);
			}

			function setScrollableStyle(style){
				if(angular.isDefined(style)){
					style = scope.$eval(style);
				}
				Ctrl.setScrollableStyle(style);
			}
			
			function setEnabled(enabled){
				if(angular.isUndefined(enabled)){
					enabled = true;
				}
				else{
					enabled = scope.$eval(enabled);
				}
				Ctrl.setEnabled(enabled);
			}

			function setDelay(delay){
				if(angular.isDefined(delay)){
					delay = scope.$eval(delay);
				}
				Ctrl.setDefaultDelay(delay);
			}

			function setDelta(delta){
				if(angular.isDefined(delta)){
					delta = scope.$eval(delta);
				}
				Ctrl.setDefaultDelta(delta);
			}

			function setStyleOnChild(onChild){
				var useElement = elem;
				if(angular.isDefined(onChild)){
					onChild = scope.$eval(onChild);
					if(onChild){
						var children = elem.children();
						if(children && children.length){
							useElement = angular.element(children[0]);
						}
					}
				}
				Ctrl.setElement(useElement);
			}

			init();
			elem.on('$destroy', Ctrl.destroy);
		}
	};
}]);

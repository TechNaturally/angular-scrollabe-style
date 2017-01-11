angular.module('angular-scrollable-style', [])
.controller('ScrollableStyleController', ['$scope', '$window', '$timeout', function($scope, $window, $timeout){
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

	function parseDynamicCssValue(cssValue){
		if(cssValue && angular.isString(cssValue)){
			cssValue = cssValue.replace(/\$height\$/g, getElementHeight);
			cssValue = cssValue.replace(/\$width\$/g, getElementWidth);
		}
		return cssValue;
	}
	function getElementHeight(){
		var value = 0;
		if(self.$element){
			value = self.$element[0].offsetHeight;
		}
		return value;
	}
	function getElementWidth(){
		var value = 0;
		if(self.$element){
			value = self.$element[0].offsetWidth;
		}
		return value;
	}

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

		// get best-matching value
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

		// handle subOpt
		if(subOpt && angular.isObject(value) && angular.isDefined(value[subOpt])){
			value = value[subOpt];
		}

		return value;
	}
	function getPropConfig(prop, opt){
		var value = getPropConfigValue(prop, opt);

		var isAbsolute = false;
		if(angular.isString(value) && value.charAt(0) == '@'){
			isAbsolute = true;
			value = value.substr(1);
		}

		if(angular.isString(value) && value.substr(-1) == '%'){
			value = parseFloat(value) / 100.0 * getScrollHeight();
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
		if(angular.isString(cssValue)){
			cssValue = parseDynamicCssValue(cssValue);

			// parse the CSS value into a value and a unit
			if(cssValue.substr(0, 4)=='rgb(' || cssValue.substr(0, 5)=='rgba('){
				// rgb/rgba colours
				var rgbMatch = /rgba?\(\s?([\d\.]+)\s?,\s?([\d\.]+)\s?,\s?([\d\.]+)\s?(,\s?([\d\.]+)\s?)?\)/.exec(cssValue);
				value = [ (angular.isDefined(rgbMatch[1])?parseFloat(rgbMatch[1]):0.0), (angular.isDefined(rgbMatch[2])?parseFloat(rgbMatch[2]):0.0), (angular.isDefined(rgbMatch[3])?parseFloat(rgbMatch[3]):0.0), (angular.isDefined(rgbMatch[5])?parseFloat(rgbMatch[5]):1.0) ];
				unit = 'rgba';
			}
			else if(cssValue.charAt(0)=='#' && /^#([A-Fa-f0-9]{3}){1,2}$/.test(cssValue)){
				// hex colours (convert to rgba)
				var hex = cssValue.substring(1).split('');
				if(hex.length==3){
					hex = [hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]];
				}
				hex = '0x'+hex.join('');
				value = [ (hex>>16)&255, (hex>>8)&255, hex&255, 1.0 ];
				unit = 'rgba';
			}
			else{
				// numerical value with optional unit
				value = parseFloat(cssValue);
				unit = cssValue.replace(''+value, '');
			}
		}
		return { value: value, unit: unit };
	}

	self.applyStyle = function(prop, percent){
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

				if(start && finish && start.unit == finish.unit){
					var value;
					// calculate current value depending on unit type
					if(start.unit == 'rgba'){
						// rgba colour values
						value = [];
						for(var i=0; i < 4; i++){
							value.push( Math.round(start.value[i] + (finish.value[i]-start.value[i])*percent) );
						}
						value = 'rgba('+value.join(',')+')';
					}
					else{
						// default to numerical value
						value = (start.value + (finish.value-start.value)*percent);
						if(start.unit){
							value += start.unit;
						}
					}

					// update the CSS property
					setCss(prop, value);
				}
				else{
					throw new Error('Invalid CSS value pair: "'+propStyle.init+'" and "'+propStyle.apply+'"');
				}
			}
		}
	};

	function assertPropStateClass(prop, stateClass){
		var targetClass = 'scrollable-style-'+prop+'-'+stateClass;
		if(propState[prop] && propState[prop].stateClass && propState[prop].stateClass != targetClass){
			self.$element.removeClass(propState[prop].stateClass);
			propState[prop].stateClass = undefined;
		}

		if(!self.$element.hasClass(targetClass)){
			self.$element.addClass(targetClass);
		}

		if(propState[prop]){
			propState[prop].stateClass = targetClass;
		}
	}

	// main property-state handler
	function handlePropState(prop, scrollDelta, scrollY, scrollHeight){
		if(propState[prop]){
			var tickSetting = PROP_STATE_TICK_SETTING[ propState[prop].state ];
			var absolute = isPropConfigAbsolute(prop, tickSetting);
			var targetTick = getPropConfig(prop, tickSetting);
			var checkTick = (absolute ? scrollY : propState[prop].ticks);

			if(propState[prop].state == PROP_STATES.DEFAULT){
				// waiting to apply
				assertPropStateClass(prop, 'waiting');
				if(checkTick >= targetTick || scrollY >= scrollHeight){
					// wait is over
					// advance to APPLYING state
					propState[prop].state = PROP_STATES.APPLYING;
					propState[prop].ticks = (checkTick - targetTick);
					if(propState[prop].ticks < 0){
						propState[prop].ticks = 0;
					}
					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
			}
			else if(propState[prop].state == PROP_STATES.APPLYING){
				// applying style
				assertPropStateClass(prop, 'applying');
				if(absolute){
					checkTick = propState[prop].ticks;
					targetTick -= (scrollY - propState[prop].ticks);
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
					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
				else if(propState[prop].ticks < 0 || scrollY <= 0){
					// cancelled applying
					self.applyStyle(prop, 0.0);

					if(getPropConfig(prop, PROP_STATE_TICK_SETTING[ PROP_STATES.DEFAULT ])){
						// regress to DEFAULT/WAITING state
						propState[prop].state = PROP_STATES.DEFAULT;
						propState[prop].ticks = 0;
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
				assertPropStateClass(prop, 'applied');
				if(absolute){
					checkTick -= scrollHeight;
					targetTick = scrollHeight - targetTick;
				}
				checkTick *= -1.0;

				if(checkTick >= targetTick || scrollY <= 0){
					// advance to RESETTING state
					propState[prop].state = PROP_STATES.RESETTING;
					propState[prop].ticks = (targetTick - checkTick);
					if(propState[prop].ticks > 0){
						propState[prop].ticks = 0;
					}
					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
			}
			else if(propState[prop].state == PROP_STATES.RESETTING){
				// resetting style
				assertPropStateClass(prop, 'resetting');
				if(absolute){
					checkTick = propState[prop].ticks;
					targetTick = (scrollY - propState[prop].ticks) - targetTick;
				}
				checkTick *= -1.0;

				if(!targetTick || checkTick >= targetTick || scrollY <= 0){
					// finished resetting
					self.applyStyle(prop, 0.0);

					// reset to DEFAULT/WAITING state
					propState[prop].state = PROP_STATES.DEFAULT;
					propState[prop].ticks = (targetTick ? (targetTick - checkTick) : scrollDelta);
					if(propState[prop].ticks > 0){
						propState[prop].ticks = 0;
					}
					handlePropState(prop, scrollDelta, scrollY, scrollHeight);
				}
				else if(propState[prop].ticks > 0 || scrollY >= scrollHeight){
					// cancelled RESETTING
					self.applyStyle(prop, 1.0);

					if(scrollY < scrollHeight && getPropConfig(prop, PROP_STATE_TICK_SETTING[ PROP_STATES.APPLIED ])){
						// regress to APPLIED (waiting to reset) state
						propState[prop].state = PROP_STATES.APPLIED;
						propState[prop].ticks = 0;
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

	self.handleScroll = function(scrollDelta, scrollY, scrollHeight, firstScroll){
		var directionChanged = false;
		if(angular.isDefined(lastScrollDelta)){
			directionChanged = ( (lastScrollDelta < 0 && scrollDelta > 0) || (lastScrollDelta >= 0 && scrollDelta < 0) );
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

				// special handling for first scroll event
				if(firstScroll){
					var absolute = isPropConfigAbsolute(prop, PROP_STATE_TICK_SETTING[ propState[prop].state ]);
					// if it's the first scroll event for a non-absolute setting
					if(!absolute){
						// reset state ticks and scrollDelta
						propState[prop].ticks -= scrollDelta;
						checkTick = propState[prop].ticks;
						scrollDelta = 0;
					}
				}

				// pass the scroll event off to the state-handler
				handlePropState(prop, scrollDelta, scrollY, scrollHeight);
			}
		}
		lastScrollDelta = scrollDelta;
	};

	function initPropStates(){
		if(!self.enabled){
			return;
		}
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

				// apply default waiting class
				assertPropStateClass(prop, 'waiting');
			}
		}
	}

	function initElement(){
		if(!self.enabled){
			return;
		}
		if(self.$element){
			self.$element.addClass('scrollable-style');
			origCss = {};
			if(self.initialized){
				initPropStates();
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
			self.$element[0].className = self.$element[0].className.replace(/(^|\s)scrollable-style-\S+/g, '');
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
	var hasInitScroll = false;
	function scrolled(event){
		var initScroll = !hasInitScroll;
		if(initScroll){
			hasInitScroll = true;
		}
		var scrollDistance = 0;
		if(angular.isUndefined(lastScroll)){
			lastScroll = $window.scrollY;
			lastScrollDelta = lastScroll;
			scrollDistance = $window.scrollY;
		}
		else {
			scrollDistance = $window.scrollY - lastScroll;
		}
		lastScroll = $window.scrollY;
		self.handleScroll(scrollDistance, $window.scrollY, getScrollHeight(), initScroll);
	}
	function initScrollWatch(){
		if(!scrollWatched){
			lastScroll = undefined;
			lastScrollDelta = 0;
			hasInitScroll = false;
			windowElem.on('scroll', scrolled);
			scrollWatched = true;

			$timeout(function(){
				if(!hasInitScroll){
					scrolled();
				}
			});
		}
	}
	function removeScrollWatch(){
		if(scrollWatched){
			windowElem.off('scroll', scrolled);
			scrollWatched = undefined;
			lastScroll = undefined;
			lastScrollDelta = undefined;
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
			initScrollWatch();
			initElement();
		}
		else if(!enable && self.enabled){
			self.enabled = enable;
			self.destroy();
		}
	};

	self.setInitialized = function(initialized){
		self.initialized = initialized;
		if(self.initialized){
			initPropStates();
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

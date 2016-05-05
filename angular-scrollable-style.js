angular.module('angular-scrollable-style', [])
.controller('ScrollableStyleController', ['$scope', '$window', function($scope, $window){
	var self = this;
	var windowElem = angular.element($window);
	var scrollWatched, lastScroll;
	self.enabled;
	self.defaultDelay = 0;
	self.defaultDelta = 0;

	var origCss = {};
	var propState = {};

	self.applyStyle = function(prop, delta){
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
	};

	self.handleScroll = function(delta, scrollY){
		if(self.style){
			for(var prop in self.style){
				var propDelay = angular.isDefined(self.style[prop].delay) ? self.style[prop].delay : self.defaultDelay;
				var propDelta = angular.isDefined(self.style[prop].delta) ? self.style[prop].delta : self.defaultDelta;
				var propActivated = false;
				if(angular.isUndefined(propState[prop])){
					propState[prop] = {active: false, activeTick: 0};
				}
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
			}
		}
	};

	function initElement(){
		if(self.$element){
			self.$element.addClass('scrollable-style');
			origCss = {};
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

	function scrolled(event){
		var scrollDistance = 0;
		if(angular.isDefined(lastScroll)){
			scrollDistance = $window.scrollY - lastScroll;
		}
		lastScroll = $window.scrollY;
		self.handleScroll(scrollDistance, $window.scrollY);
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
		self.style = style;
	};
	self.setDefaultDelay = function(delay){
		if(!delay){
			delay = 0;
		}
		self.defaultDelay = delay;
	};
	self.setDefaultDelta = function(delta){
		if(!delta){
			delta = 0;
		}
		self.defaultDelta = delta;
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
			Ctrl.setElement(elem);

			function setScrollableStyle(style){
				if(angular.isDefined(style)){
					style = scope.$eval(style);
				}
				Ctrl.setScrollableStyle(style);
			}
			setEnabled(attr['ngScrollableStyle']);
			attr.$observe('ngScrollableStyle', setScrollableStyle);

			function setEnabled(enabled){
				if(angular.isUndefined(enabled)){
					enabled = true;
				}
				else{
					enabled = scope.$eval(enabled);
				}
				Ctrl.setEnabled(enabled);
			}
			setEnabled(attr['ngScrollableStyleEnabled']);
			attr.$observe('ngScrollableStyleEnabled', setEnabled);

			function setDelay(delay){
				if(angular.isDefined(delay)){
					delay = scope.$eval(delay);
				}
				Ctrl.setDefaultDelay(delay);
			}
			setEnabled(attr['ngScrollableStyleDelay']);
			attr.$observe('ngScrollableStyleDelay', setDelay);

			function setDelta(delta){
				if(angular.isDefined(delta)){
					delta = scope.$eval(delta);
				}
				Ctrl.setDefaultDelta(delta);
			}
			setEnabled(attr['ngScrollableStyleDelta']);
			attr.$observe('ngScrollableStyleDelta', setDelta);

			elem.on('$destroy', Ctrl.destroy);
		}
	};
}]);

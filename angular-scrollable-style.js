angular.module('angular-scrollable-style', [])
.controller('ScrollableStyleController', ['$scope', '$window', function($scope, $window){
	var self = this;
	var windowElem = angular.element($window);
	var scrollWatched, lastScroll;
	self.enabled;

	var origCss = {};
	function resetCss(){
		if(self.$element){
			for(var prop in origCss){
				self.$element.css(prop, origCss[prop]);
			}
		}
	}
	function setCss(prop, value){
		if(self.$element){
			if(angular.isUndefined(origCss[prop])){
				origCss[prop] = self.$element[0].style[prop];
			}
		}
	}

	self.handleScroll = function(distance, scrollY){
		console.log('handle scroll by '+distance+' TO '+scrollY);
	};

	function scrolled(event){
		var scrollDistance = $window.scrollY;
		if(angular.isDefined(lastScroll)){
			scrollDistance -= lastScroll;
		}
		lastScroll = $window.scrollY;
		self.handleScroll(scrollDistance, lastScroll);
	}
	function initScrollWatch(){
		if(!scrollWatched){
			windowElem.on('scroll', scrolled);
			scrollWatched = true;
		}
	}
	function removeScrollWatch(){
		if(scrollWatched){
			windowElem.off('scroll', scrolled);
			scrollWatched = undefined;
			lastScroll = undefined;
		}
	}

	self.setElement = function(element){
		resetElement();
		self.$element = element;
		initElement();
	};
	function initElement(){
		if(self.$element){
			self.$element.addClass('scrollable-style');
			origCss = {};
		}
	}
	function resetElement(){
		if(self.$element){
			resetCss();
			self.$element.removeClass('scrollable-style');
		}
	}

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

			function setEnabled(scrollableStyleEnabled){
				if(angular.isUndefined(scrollableStyleEnabled)){
					scrollableStyleEnabled = true;
				}
				else{
					scrollableStyleEnabled = scope.$eval(scrollableStyleEnabled);
				}
				Ctrl.setEnabled(scrollableStyleEnabled);
			}
			setEnabled(attr['ngScrollableStyleEnabled']);
			attr.$observe('ngScrollableStyleEnabled', setEnabled);

			elem.on('$destroy', Ctrl.destroy);
		}
	};
}]);

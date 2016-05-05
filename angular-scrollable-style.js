angular.module('angular-scrollable-style', [])
.controller('ScrollableStyleController', ['$scope', function($scope){
	var self = this;
	this.enabled = true;

	this.setElement = function(element){
		this.$element = element;
		if(this.$element && this.enabled){
			this.$element.addClass('scrollable-style');
		}
	};

	this.setEnabled = function(enable){
		if(enable && !this.enabled){
			if(this.$element){
				this.$element.addClass('scrollable-style');
			}
			this.enabled = enable;
		}
		else if(!enable && this.enabled){
			if(this.$element){
				this.$element.removeClass('scrollable-style');
			}
			this.enabled = enable;
		}
	};
}])
.directive('ngScrollableStyle', [function(){
	return {
		restrict: 'A',
		require: 'ngScrollableStyle',
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
		},
		controller: 'ScrollableStyleController'
	};
}]);

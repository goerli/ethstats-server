
/* Directives */

angular.module('netStatsApp.directives', [])
	.directive('appVersion', ['version', function (version) {
		return function(scope, elm, attrs) {
			elm.text(version);
		};
}])
// 	.directive('timeAgo', ['$interval', function($interval) {
// 		function link (scope, element, attrs)
// 		{
// 			var timestamp,
// 				timeoutId;

// 			function updateTime() {
// 				element.text(timeAgo())
// 			}

// 			function timeAgo()
// 			{
// 				if(timestamp === 0)
// 					return '∞';

// 				var time = (new Date()).getTime();
// 				var diff = Math.floor((time - timestamp)/1000);

// 				if(diff < 60)
// 					return Math.round(diff) + ' s ago';

// 				return moment.duration(Math.round(diff), 's').humanize() + ' ago';
// 			};

// 			scope.$watch(attrs.timeAgo, function(value) {
// 				timestamp = value;
// 				updateTime();
// 			});

// 			element.on('$destroy', function() {
// 				$interval.cancel(timeoutId);
// 			});

// 			timeoutId = $interval(function () {
// 				updateTime();
// 			}, 200);
// 		};

// 		return {
// 			link: link
// 		};
// }])

	.directive('minerblock', function ($compile) {
		return {
			restrict: 'E',
			template: '<div></div>',
			replace: true,
			link: function (scope, element, attrs)
			{
				var makeClass = function (value)
				{
					if(value <= 6)
						return 'success';

					if(value <= 12)
						return 'info';

					if(value <= 18)
						return 'warning';

					if(value <= 24)
						return 'orange';

					return 'danger';
				}

				attrs.$observe("blocks", function (newValue)
				{
					var content = '';
					var blockClass = 'bg-' + makeClass(newValue);

					for(var i = 0; i < newValue; i++)
					{
						content += '<div class="block ' + blockClass + '"></div>';
					}

					element.empty();
					element.html(content);
				});
			}
		};
})
	.directive('sparkchart', function () {
		return {
			restrict: 'E',
			scope: {
				data: '@'
			},
			compile: function (tElement, tAttrs, transclude)
			{
				tElement.replaceWith('<span>' + tAttrs.data + "</span>");

				// register resize watcher
				var timeout;
				var width;
				$(window).on('resize', function(e) {
					if( $('body').width() < 600 )
						width = 4;
					else if( $('body').width() < 1200 )
						width = 5;
					else
						width = 6;

					if(timeout)
						clearTimeout(timeout);
					timeout = setTimeout(function() {
						$.fn.sparkline.defaults.bar.barWidth = width;
					}, 200);
				});

				return function(scope, element, attrs)
				{
					attrs.$observe("data", function (newValue)
					{
						element.html(newValue);
						element.addClass("big-details");
						element.sparkline('html', {
							type: 'bar',
							tooltipSuffix: (attrs.tooltipsuffix || '')
						});
					});
				};
			}
		};
})
	.directive('nodepropagchart', function() {
		return {
			restrict: 'E',
			scope: {
				data: '@'
			},
			compile: function (tElement, tAttrs, transclude)
			{
				tElement.replaceWith('<span>' + tAttrs.data + "</span>");

				function formatTime (ms) {
					var result = 0;

					if(ms < 1000) {
						return ms + " ms";
					}

					if(ms < 1000*60) {
						result = ms/1000;
						return result.toFixed(1) + " s";
					}

					if(ms < 1000*60*60) {
						result = ms/1000/60;
						return Math.round(result) + " min";
					}

					if(ms < 1000*60*60*24) {
						result = ms/1000/60/60;
						return Math.round(result) + " h";
					}

					result = ms/1000/60/60/24;
					return Math.round(result) + " days";
				};

				return function(scope, element, attrs)
				{
					attrs.$observe("data", function (newValue)
					{
						element.html(newValue);
						element.sparkline('html', {
							type: 'bar',
							negBarColor: '#7f7f7f',
							zeroAxis: false,
							height: 20,
							barWidth : 2,
							barSpacing : 1,
							tooltipSuffix: '',
							chartRangeMax: 8000,
							colorMap: jQuery.range_map({
								'0:1': '#8be9fd',
								'1:1000': '#50fa7b',
								'1001:3000': '#f1fa8c',
								'3001:7000': '#ffb86c',
								'7001:': '#ff5555'
							}),
							tooltipFormatter: function (spark, opt, ms) {
								var tooltip = '<div class="tooltip-arrow"></div><div class="tooltip-inner">';
								tooltip += formatTime(ms[0].value);
								tooltip += '</div>';

								return tooltip;
							}
						});
					});
				};
			}
		};
})
	.directive('histogram', ['$compile', function($compile) {
		return {
			restrict: 'EA',
			scope: {
				data: '='
			},
			link: function(scope, element, attrs)
			{
				var margin = {top: 0, right: 0, bottom: 0, left: 0};
				var width = 280 - margin.left - margin.right,
					height = 63 - margin.top - margin.bottom;

				// fix for mobile devices
				if( $('body').width() < 600 )
					width = 200 - margin.left - margin.right;
				else( $('body').width() < 1200 )
					width = 240 - margin.left - margin.right;

				var TICKS = 40;

				var x = d3.scaleLinear()
					.domain([0, 10000])
					.rangeRound([0, width])
					.interpolate(d3.interpolateRound);

				var y = d3.scaleLinear()
					.range([height, 0])
					.interpolate(d3.interpolateRound);

				var color = d3.scaleLinear()
					.domain([1000, 3000, 7000, 10000])
					.range(["#50fa7b", "#f1fa8c", "#ffb86c", "#ff5555"]);

				var xAxis = d3.axisBottom(x)
					.ticks(4, ",.1s")
					.tickFormat(function(t){ return t/1000 + "s"});

				var yAxis = d3.axisLeft(y)
					.ticks(3)
					.tickFormat(d3.format(".0%"));

				var line = d3.line()
					.x(function(d) { return x(d.x + d.dx/2) - 1; })
					.y(function(d) { return y(d.y) - 2; })
					.curve(d3.curveBasis);

				var tip = d3.tip()
					.attr('class', 'd3-tip')
					.offset([10, 0])
					.direction('s')
					.html(function(d) {
						return '<div class="tooltip-arrow"></div><div class="tooltip-inner"><b>' + (d.x/1000) + 's - ' + ((d.x + d.dx)/1000) + 's</b><div class="small">Percent: <b>' + Math.round(d.y * 100) + '%</b>' + '<br>Frequency: <b>' + d.frequency + '</b><br>Cumulative: <b>' + Math.round(d.cumpercent*100) + '%</b></div></div>';
					})

				scope.init = function(width)
				{
					var data = scope.data;

					var x = d3.scaleLinear()
						.domain([0, 10000])
						.rangeRound([0, width])
						.interpolate(d3.interpolateRound);

					var xAxis = d3.axisBottom(x)
						.ticks(4, ",.1s")
						.tickFormat(function(t){ return t/1000 + "s"});

					var line = d3.line()
						.x(function(d) { return x(d.x + d.dx/2) - 1; })
						.y(function(d) { return y(d.y) - 2; })
						.curve(d3.curveBasis);

					// Adjust y axis
					y.domain([0, d3.max(data, function(d) { return d.y; })]);

					// Delete previous histogram
					element.empty();

					/* Start drawing */
					var svg = d3.select(".d3-blockpropagation")
						.append("svg")
						.attr("width", width + margin.left + margin.right)
						.attr("height", height + margin.top + margin.bottom)
					  .append("g")
						.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

					svg.call(tip);

					svg.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + height + ")")
						.call(xAxis)
						.selectAll("text")
						.attr("y", 6);

					svg.append("g")
						.attr("class", "y axis")
						.attr("transform", "translate(" + width + ", 0)")
						.call(yAxis);

					var bar = svg.append("g")
						.attr("class", "bars")
					  .selectAll("g")
					  .data(data)
					  .enter().append("g")
						.attr("transform", function(d) { return "translate(" + x(d.x) + ",0)"; })
						.on('mouseover', function(d) { tip.show(d, d3.select(this).select('.bar').node()); })
						.on('mouseout', tip.hide);

					bar.insert("rect")
						.attr("class", "handle")
						.attr("y", 0)
						.attr("width", x(data[0].dx + data[0].x) - x(data[0].x))
						.attr("height", function(d) { return height; });

					bar.insert("rect")
						.attr("class", "bar")
						.attr("y", function(d) { return y(d.y); })
						.attr("rx", 1)
						.attr("ry", 1)
						.attr("fill", function(d) { return color(d.x); })
						.attr("width", x(data[0].dx + data[0].x) - x(data[0].x) - 1)
						.attr("height", function(d) { return height - y(d.y) + 1; });

					bar.insert("rect")
						.attr("class", "highlight")
						.attr("y", function(d) { return y(d.y); })
						.attr("fill", function(d) { return d3.rgb(color(d.x)).brighter(.7).toString(); })
						.attr("rx", 1)
						.attr("ry", 1)
						.attr("width", x(data[0].dx + data[0].x) - x(data[0].x) - 1)
						.attr("height", function(d) { return height - y(d.y) + 1; });

					svg.append("path")
						.attr("class", "line")
						.attr("d", line(data));
				}

				scope.$watch('data', function() {
					if(scope.data.length > 0) {
						scope.init(width);
					}
				}, true);

				var timeout;
				$(window).on('resize', function(e) {
					var width = 280 - margin.left - margin.right;
					if( $('body').width() < 768 )
						width = 200 - margin.left - margin.right;

					if(timeout)
						clearTimeout(timeout);

					timeout = setTimeout(function() {
						// redraw
						scope.init(width);
					}, 200);
				});
			}
		};
	}]);
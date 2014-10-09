define([], function() {

    var routeInfo = {
        'tool-uamp': {
            url: '/tool/ua-metric-platform',
            templateUrl: 'templates/tool/ua-metric-platform.html',
            controller: 'UAMPCtrl'
        }
    };

    // Todo: 请求 children 的 metric id?
    // Todo: dimension 变成数组
    // jQuery 等 non-angular 代码:
    // datepicker 设置时间和取时间，diemsion select 设置和取值，daterangepicker 设置和取值
    function UAMPCtrl($scope, $rootScope, apiHelper, $filter) {
        // reportList 和 state.report, state.period, state.dimension, state.chartMetri, state.dateTime
        $scope.state = {
            isSelectMetricMode: false,
            hasFetchData: false
        };
        var flatMetricsData,
            _state = $scope.state;

        apiHelper('getUAMPReportList').then(function(data) {
            $scope.reportList = data;
            // first or from url
            $scope.selectReport(1);
        });

        // 左面切换 report
        $scope.selectReport = function(id) {
            _state.hasFetchData = false;
            apiHelper('getUAMPReportDetail', id).then(function(data) {
                _state.report = data;
                _state.timespan = _state.report.timespan[0][0];
                // Todo: dateTime inital set
                // dimension intial set
                _state.dimension = _.map(_state.report.dimension, function(d) {
                    return {
                        id: d.id,
                        value: ["##ALL##"]
                    };
                });
                $scope.fetchReportData();
            });
        };

        // apply 请求 report table 数据
        $scope.fetchReportData = function() {
            // 依赖于_state.report 和 日期，dimension_选择情况 - check 下
            apiHelper('getUAMPReportData', _state.report.id, {
                params: {
                    dimension: JSON.stringify(_state.dimension),
                    timespan: _state.timespan,
                    dateTime: 20140921
                }
            }).then(function(data) {
                flatMetricsData = [];
                flattenReportMetric(data.tableData);
                $scope.flatMetricsData = flatMetricsData;
                $scope.reportData = data;
                _state.hasFetchData = true;
            });
        };

        // 绘制趋势
        $scope.renderChart = function() {
            // set chartConfig data option
            $scope.chartConfig = {
                options: {
                    chart: {
                        type: 'line', // spline
                        zoomType: 'x'
                    }
                },
                series: [{
                    data: [5146747.0000, 5616327.0000, 5628277.0000, 5632576.0000, 5974986.0000, 5127350.0000, 5158867.0000, 5127709.0000]
                }],
                xAxis: {
                    categories: ["20140910", "20140911", "20140912", "20140913", "20140914", "20140915", "20140916", "20140917"],
                },
                title: {
                    text: 'Hello' // 标题
                },
                loading: false
            };
            _state.isShowChart = true;
        };

        /* watchersss 监控~~ */

        // set datepicker jquery plugin
        $scope.$watch('state.timespan', function(timespan) {
            if (!timespan) return;
            var baseOpt = {
                autoclose: true,
                todayHighlight: true,
                endDate: new Date()
            };
            var timespanDPoptionMap = {
                1440: _.extend({}, baseOpt, {
                    format: 'yyyy-mm-dd'
                }),
                10080: _.extend({}, baseOpt, {
                    format: 'yyyy-mm-dd',
                    daysOfWeekDisabled: "0,2,3,4,5,6"
                }),
                43200: _.extend({}, baseOpt, {
                    format: 'yyyy-mm',
                    minViewMode: 'months',
                    startView: 'months'
                })
            };
            var prevFnMap = {
                1440: getPrevDay,
                10080: getPrevMonday,
                43200: getPrevMonth
            };
            $('.date-picker').datepicker('remove');
            $('.date-picker').datepicker(timespanDPoptionMap[timespan]);
            $('.date-picker').datepicker('setDate', prevFnMap[timespan].call());
        }, true);


        /* view helper */

        // 指标前面的+-控制 isOpen
        $scope.toggleMetricOpenStatus = function(metric) {
            metric.isopened = !metric.isopened;
            // ajaxxing~~~
            if (metric.haschildren && (!metric.children)) {
                //  Todo --- 同时保留其他 param
                apiHelper('getUAMPReportData', metric.id).then(function(data) {
                    var _idx = _.indexOf($scope.flatMetricsData, metric);
                    flatMetricsData = [];
                    flattenReportMetric(data.tableData);
                    flatMetricsData.unshift(flatMetricsData.length);
                    flatMetricsData.unshift(_idx + 1);
                    Array.prototype.splice.apply($scope.flatMetricsData, flatMetricsData);
                });
            }
        };

        // metric name 层级 padding
        $scope.setMetricLevelStyle = function(metric) {
            return {
                'padding-left': 20 * inferMetricLevel(metric)
            };
        };

        // 看看该 row 是否被 parent collapse
        $scope.inferFromParent = function(children) {
            if (!children.parent) return true;
            return findParentInFlat(children).isopened;
        };

        // data cell 根据类型显示上升下降颜色和百分百
        $scope.formatByType = function(val, idx) {
            var type = $scope.reportData.tableTitle[idx + 1];
            var ret = val;
            switch (type.data_diff) {
                case 'ratio':
                    ret = $filter('percentize')(val);
                case 'minus':
                    if (val > 0) {
                        ret = '<b class="metric-minus-up">' + ret + '</b>';
                    } else if (val < 0) {
                        ret = '<b class="metric-minus-down">' + ret + '</b>';
                    }
                default:
                    ret = ret;
            }
            return ret;
        };

        function findParentInFlat(children) {
            return _.find($scope.flatMetricsData, function(i) {
                return i.name === children.parent;
            });
        }

        function inferMetricLevel(metric) {
            var level = 0;
            while (metric.parent) {
                level += 1;
                metric = findParentInFlat(metric);
            }
            return level;
        }

        function flattenReportMetric(metric, parent) {
            if (_.isArray(metric)) {
                _.each(metric, function(i) {
                    flattenReportMetric(i, parent);
                });
            } else {
                if (metric.data) {
                    if (parent) {
                        metric.parent = parent;
                    }
                    flatMetricsData.push(metric);
                }
                if (metric.children) {
                    flattenReportMetric(metric.children, metric.name);
                }
            }
        }

        function getPrevDay() {
            var x = new Date().getTime();
            return new Date(x - 1000 * 3600 * 24);
        }

        function getPrevMonday() {
            var x = new Date();
            if (x.getDay() != 0) {
                x.setDate(x.getDate() - 7 - 6);
            } else {
                x.setDate(x.getDate() - x.getDay() - 6);
            }
            return x;
        }

        function getPrevMonth() {
            var x = new Date();
            x.setDate(1);
            x.setMonth(x.getMonth() - 1);
            return x;
        }
    }

    // 1?timespan=1440&dateTime=20140921&dimensions=[{"id": 1, "value": ["", "1"]}, {"id": 2, "value": [""]}]
    angular.module('muceApp.tool', ['highcharts-ng'])
        .directive('uampCheckboxSelect', function($timeout) {
            // http://wenzhixin.net.cn/p/multiple-select/docs/#methods
            return {
                templateUrl: 'uamp-checkbox-select.html',
                link: function($scope, $elem, $attr) {
                    $timeout(function() {
                        $elem.find('select').multipleSelect({
                            allSelected: false
                        });
                    });
                },
                replace: true
            }
        })
        .controller('UAMPCtrl', UAMPCtrl)
        .config(function($stateProvider) {
            _.each(routeInfo, function(opt, name) {
                $stateProvider.state(name, opt);
            });
        });
});
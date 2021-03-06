define(function() {
    // @ngInject
    function settingCtrl($scope, apiHelper, $timeout, $state, $rootScope, $filter, $modal) {
        var _state = $rootScope.state;
        console.log('settingCtrl');

        var _maxAvailableDate = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 1);

        $(document).ready(function() {
            var _quickMap = {};
            _.each(Config.quickDataList, function(i) {
                _quickMap[i[0]] = [moment().subtract('days', i[1])._d, moment()._d];
            });
            $('.daterangepicker').remove();
            $('input[name="daterange"]').daterangepicker({
                ranges: _quickMap,
                // format: 'YYYY-MM-DD',
                endDate: _maxAvailableDate,
                maxDate: _maxAvailableDate
            }, function(start, end) {
                var copyMaxAvailable = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 1);
                if(_maxAvailableDate.getDate() != copyMaxAvailable.getDate()) {
                    location.reload();
                }
                var s = $filter('date')(new Date(start), 'MM/dd/yyyy'),
                e = $filter('date')(new Date(end), 'MM/dd/yyyy'),
                dr = s +' - '+ e;
                $('input[name="daterange"]').val(dr);
                _state.endDate = end._d;
                _state.startDate = start._d;
                fetchReports();
            });

            var changeDom = function(){
                $('.daterangepicker .ranges .range_inputs').after($('.daterangepicker .ranges ul'));
                $('.daterangepicker .ranges .range_inputs button').eq(1).after($('.daterangepicker .ranges .range_inputs button')[0]);
                
            }, once = _.once(changeDom);

            $('input[name="daterange"]').on('show.daterangepicker', function(ev, picker) {
                once();
            }); 
        });

        function setDefaultDateRange() {
            function updateInput() {
                var $daterange = $('#daterange');
                if ($daterange) {
                    $daterange.data('daterangepicker').setStartDate(_state.startDate);
                    $daterange.data('daterangepicker').setEndDate(_state.endDate);
                }
            }
            if (!_state.startDate) {
                var now = new Date();
                now.setHours(0, 0, 0, 0);
                _state.startDate = new Date(now.getTime() - (1000 * 60 * 60 * 24) * 15);
                _state.endDate = _maxAvailableDate;
                updateInput();
            }
            if (_state._isFromUrlInit) {
                _state._isFromUrlInit = false;
                updateInput();
            }
            fetchReports();
        }

        $scope.ghostDimension = {
            name: ''
        };
        $scope.quickChooseList = Config.quickDataList;

        _state.firstInit = true;
        $scope.$watch('state.report', function(report) {
            if (!report) return;

            apiHelper('getReportDetail', report.id, {
                busy: 'global'
            }).then(function(data) { 

                _state.reportDetail = data;
                _state.dimenAdv.clearStatus();

                _state.dimensionsSelect = _state.reportDetail.dimensions;

            });
        }, true);

        $scope.$watch('currentQuick', function(val) {
            if (!val) return;
            var now = new Date();
            now.setHours(0, 0, 0, 0);
            _state.startDate = new Date(now.getTime() + (1000 * 60 * 60 * 24) * (-(val) - 1));
            _state.endDate = _maxAvailableDate;
            var $daterange = $('#daterange');
            if ($daterange) {
                $daterange.data('daterangepicker').setStartDate(_state.startDate);
                $daterange.data('daterangepicker').setEndDate(_state.endDate);
            }
            fetchReports();
        });

        $rootScope.$watch('state.period', function(val) {
            if (val === undefined) return;
            _.each($('.date-operator .quickdate-button'), function(i, ii) {
                var _tmp = $(i).scope();
                _tmp.disableTimepicker = val ? false : true;
                _tmp.labelFormat = Config.periodFormatMap[val];
            });
            fetchReports();
        });
        var hasInArr = [];
        $scope.addDimension = function(arg){
            //repeat check
            if (hasInArr.length == 3) {
                hasInArr.shift(); 
                _state.dimenAdv.dimensions.shift();
            }
            if (hasInArr.indexOf(arg.dimensions.name) == -1) {
                hasInArr.push(arg.dimensions.name); 
                _state.dimenAdv.dimensions.push(arg.dimensions);
            }
        }
        
        $scope.delDimension = function(item){
            hasInArr = _.without(hasInArr, item.name);
            _state.dimenAdv.dimensions = _.without(_state.dimenAdv.dimensions , item);
            $scope.dimensions = _state.dimenAdv.dimensions[_state.dimenAdv.dimensions.length - 1];
        }

        /* Dimen Advanced Modal */
        var dimenAdvModal;
        $scope.openAdvancedPanel = function() {
            dimenAdvModal = $modal.open({
                templateUrl: 'report/dimen-adv-modal.html',
                scope: $scope
            });
        };
        _state.dimenAdv = {
            dimensions: [],
            filters: null,
            filterTypes: ['EQUAL', 'NOT_EQUAL', 'CONTAINING', 'STARTSWITH', 'ENDSWITH', 'NOT_CONTAINING', 'NOT_STARTSWITH', 'NOT_ENDSWITH'],
            nowDimensionsType: [],
            nowDimensionsVal: [],
            saveFilters: function() {
                var self = this;
                self.filters = [];
                _.each(self.dimensions, function(i, idx) {
                    // {"value":"1.0.0","key":"d1","operator":"EQUAL"}
                    if (self.nowDimensionsType[idx] && self.nowDimensionsVal[idx]) {
                        self.filters.push({
                            value: self.nowDimensionsVal[idx],
                            operator: self.nowDimensionsType[idx],
                            key: 'd' + i.id
                        });
                    }
                });
                // Tdo: move to chartStateDiff
                self.filters ? fetchReports() : '';
                dimenAdvModal.close();
            },
            deSerFilters: function() {
                var self = this;
                _.each(self.filters, function(item) {
                    self.nowDimensionsType.push(item.operator);
                    self.nowDimensionsVal.push(item.value);
                });
            },
            clearStatus: function() {
                var self = this;
                hasInArr = [];
                self.dimensions = [];
                self.filters = null;
                self.nowDimensionsVal = [];
                self.NOT_ENDSWITH = [];
            },
            removeFilters: function() {
                this.filters = null;
                this.nowDimensionsVal = [];
                this.nowDimensionsType = [];
            }
        };

        $rootScope.$watch('state.reportDetail', function(data) {
            if (!data) return;
            if (!_state.firstInit) {
                /*$scope.currentQuick = 0;
                $timeout(function() {
                    _state.period = data.periods[0];
                    $scope.currentQuick = -14; // last two week
                });*/
                $timeout(function() {
                    _state.period = data.periods[0];
                    setDefaultDateRange();
                });
                return;
            }
            _state.firstInit = false;
            if ($state.params.dimensions) {
                _state.dimenAdv.dimensions = _.map(JSON.parse($state.params.dimensions), function(id) {
                    return _.find(_state.reportDetail.dimensions, function(item) {
                        hasInArr.push(item.name);
                        return item.id === id;
                    });
                });
            }

            if ($state.params.filters && !_state.dimenAdv.filters) {
                _state.dimenAdv.filters = JSON.parse($state.params.filters);
                // rebuild the filters panel
                _state.dimenAdv.deSerFilters();
            }

            if ($state.params.startDate && $state.params.endDate && $state.params.period) {
                _.each(['startDate', 'endDate'], function(type) {
                    _state[type] = Helper.deSerApiDate($state.params[type], $state.params.period);
                });
                _state.period = $state.params.period;
                _state._isFromUrlInit = true;
                setDefaultDateRange();
            } else {
                /*$scope.currentQuick = 0;
                $timeout(function() {
                    _state.period = data.periods[0];
                    $scope.currentQuick = -14; // last two week
                });*/
                $timeout(function() {
                    _state.period = data.periods[0];
                    setDefaultDateRange();
                });
            }
        }, true);

        _state.isFetching = false;

        function fetchReports() {
            if (!_state.startDate) return;
            if (_.isUndefined(_state.period)) return;
            // if (_state.isFetching) return;
            _state.isFetching = true;
            // clean up dimensions
            _state.dimenAdv.dimensions = _.filter(_state.dimenAdv.dimensions, function(i) {
                if (i) return i;
            });
            var nextParams = {
                group: _state.group.name,
                category: _state.category.name,
                report: _state.report.name,
                startDate: Helper.serApiDate(_state.startDate, _state.period),
                endDate: Helper.serApiDate(_state.endDate, _state.period),
                period: '' + _state.period,
                dimensions: JSON.stringify(_.pluck(_state.dimenAdv.dimensions, 'id')),
                filters: JSON.stringify(_state.dimenAdv.filters)
            };
            if (testObjEqual(_state.detailParams, nextParams)) return;
            // if ($state.is('report.detail') && testObjEqual(nextParams, $state.params)) return;
            _state.detailParams = nextParams;
            console.log('go to report.detail');
            $state.go('report.detail', nextParams);

            $timeout(function() {
                $rootScope.$emit('report:fetchReportData');
            }, 100);
        }
        // var fetchReports = _.throttle(_fetchReports, 2000);
        $scope.fetchReports = fetchReports;

        // view helper
        $scope.onDateChange = function() {
            // reset currentQuick
            $scope.currentQuick = '';
        };
        $scope.startDateFilter = function(d) {
            var isLessEnd = true,
                isLessToday = d.getTime() < Helper.getMaxAvailableDate();
            if (_state.endDate) {
                isLessEnd = d.getTime() < _state.endDate.getTime();
            }
            return isLessEnd && isLessToday;
        };
        $scope.endDateFilter = function(d) {
            var isLargeStart = true,
                isLessToday = d.getTime() < Helper.getMaxAvailableDate();
            if (_state.startDate) {
                isLargeStart = d.getTime() > _state.startDate.getTime();
            }
            return isLargeStart && isLessToday;
        };

        var Helper = {
            getMaxAvailableDate: function() {
                return (new Date()).getTime() - (1000 * 60 * 60 * 24) * 1;
            },
            serApiDate: function(datetime, period) {
                return $filter('date')(datetime, Config.apiDateFormatMap[period]);
            },
            deSerApiDate: function(datetime, period) {
                var parseMap = {
                    '0': function(str) {
                        var y = str.substr(0, 4),
                            m = str.substr(4, 2) - 1,
                            d = str.substr(6, 2);
                        return new Date(y, m, d);
                    },
                    '1': function(str) {
                        var y = str.substr(0, 4),
                            m = str.substr(4, 2) - 1,
                            d = str.substr(6, 2),
                            h = str.substr(8, 2);
                        return new Date(y, m, d, h);
                    }
                }
                return parseMap[period](datetime)
            }
        };

        function testObjEqual(obj1, obj2) {
            return JSON.stringify(obj1) === JSON.stringify(obj2);
        }
    };

    return settingCtrl;
});
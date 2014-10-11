define(function() {
    function tableCtrl($scope, $rootScope, $filter, $timeout) {
        var _state = $rootScope.state;
        var _tableDataPg = 1;
        var _allTableData = [],
            _reportDetail; // store all tableData
        $scope.tableRows = [];
        $rootScope.$on('report:renderReportData', function(event, opt) {
            // store full amount data inner
            _reportDetail = opt[0];
            _allTableData = opt[1];
            buildGridHeader(_reportDetail, _allTableData);
            buildGridData();
        });

        /* Data Table */
        function buildGridHeader(reportDetail, data) {
            // dependency: data['dimensions/metrics']
            function getNameById(i, type) {
                return _.find(reportDetail[type], function(d) {
                    return d.id == i;
                }).name;
            }

            var tbFields = [{
                id: 'date',
                name: 'Date'
            }];
            _.each(['dimensions', 'metrics'], function(type) {
                _.each(data[type], function(i) {
                    tbFields.push({
                        id: (type == 'metrics') ? i : 'd' + i,
                        name: getNameById(i, type)
                    });
                });
            });
            $timeout(function() {
                $scope.tbFields = tbFields;
            }, 20);
        }

        function buildGridData() {
            /*$scope.tableRows = _.map(data.result, function(i) {
                // we need date filter to format
                i.date = +(i.date);
                return i;
            });*/
            $timeout(function() {
                var _updates = _allTableData.result.slice(0, 50);
                $scope.tableRows = $scope.tableRows.concat(_updates);
            }, 20);
        }

        $scope.loadMoreReportData = _.throttle(function() {
            console.log('fetching...');
            if (!_reportDetail || !_allTableData) return;
            _tableDataPg += 1;
            buildGridData();
        }, 1000);

        $scope.sortReverse = false;
        $scope.toggleRowSort = function(type) {
            // use native sort method, instead of angular's filter orderBy
            $scope.sortType = type;
            $scope.sortReverse = !$scope.sortReverse;
            var tableRows = _.sortBy($scope.tableRows, function(item) {
                /*if ($scope.sortBy === 'date') {
                    // make date number to sort
                    return +item[type];
                }*/
                return item[type];
            });
            if ($scope.sortReverse) {
                tableRows.reverse();
            }
            $scope.tableRows = [];
            $timeout(function() {
                $scope.tableRows = tableRows;
            });
        };

        $scope.exportTableAsCsv = function(tbFields, tableRows) {
            function buildCsvName() {
                return _.template(Config.csvFileNameTpl, {
                    report: _state.report.name,
                    start: $filter('date')(_state.startDate, 'yyyymmdd'),
                    end: $filter('date')(_state.endDate, 'yyyymmdd')
                });
            }

            function buildCsvContent() {
                var resultArr = [],
                    csvContent;
                var ids = _.pluck(tbFields, 'id');
                resultArr.push(_.pluck(tbFields, 'name'));

                _.each(tableRows, function(row) {
                    resultArr.push(_.map(ids, function(key) {
                        return row[key];
                    }));
                });

                csvContent = _.map(resultArr, function(rowArr, idx) {
                    return rowArr.join(',')
                }).join('\n');
                // http://stackoverflow.com/questions/23816005/anchor-tag-download-attribute-not-working-bug-in-chrome-35-0-1916-114
                return URL.createObjectURL(new Blob([csvContent], {
                    type: 'text/csv'
                }));
            }

            function doMockLink() {
                var link = document.createElement("a");
                link.href = buildCsvContent();
                link.download = buildCsvName();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // open
            /*var newTab = window.open();
            $(newTab.document.body).html(csvContent.replace(/\n/g, '<br/>'));*/
            doMockLink();
        };

        $scope.getTdType = function(field, data) {
            if (field.id === 'date') {
                return 'date';
            }
            if (_.isNumber(field.id)) {
                if (data[field.id] === '0.00') {
                    return 'empty';
                } else {
                    return 'metric';
                }
            } else {
                return 'dimension';
            }
        };

        /* Utility */
        function transDateFormatByPeriod(dict) {
            var dateFormatMap = {
                1: 'yyyyMMddhh',
                0: 'yyyyMMdd'
            };
            _.each(['startDate', 'endDate'], function(key) {
                dict[key] = $filter('date')(dict[key], dateFormatMap[dict.period]);
            });

            return dict;
        }
    }

    angular.module('muceApp.report.tableCtrl', [])
        .controller('tableCtrl', tableCtrl);
});
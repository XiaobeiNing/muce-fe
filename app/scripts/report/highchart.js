define([
    'base/helper'
], function(helper) {
    // Fuck. date format(humanable, or timestamp etc)
    var buildLineChart = function(currentReport, data) {
        $('#highcharts_wrapper').html('Report No Data');
        var uniqCate = _.uniq(_.pluck(currentReport.metrics, 'type'));
        var isMutipleY = currentReport.metrics.length > 1 && uniqCate.length > 1;
        var periodMap = {
            0: 'day',
            1: 'hour'
        };
        data.period = periodMap[data.period];

        function formatTip() {
            var periodFormatMap = {
                hour: '%A %Y-%m-%e:%H',
                day: '%A %Y-%m-%e',
                week: '%A %Y-%m-%e',
                month: '%Y-%m'
            };

            var s = '<b>' + Highcharts.dateFormat(periodFormatMap[data.period], this.x) + '</b>';
            $.each(this.points, function(i, point) {
                s += '<br/><p style="color: ' + point.series.color + '">' + point.series.name + ': ' +
                    point.y;
            });

            return s;
        }

        function getSeries() {
            var retData = []
            if (data.result && data.result.length) {
                // var annotationPoints = [];
                _.each(currentReport.metrics, function(item, index) {
                    var detailData = {};
                    detailData = {
                        name: item.name,
                        data: [],
                        id: item.id,
                        pointStart: helper.getUTCDateByDateAndPeriod(data.result[0].date, data.period),
                        pointInterval: helper.getIntervalByPeriod(data.period)
                    };
                    // change percent to 2
                    if (isMutipleY && item.type === 2) {
                        detailData.yAxis = 1;
                    }
                    retData.push(detailData);
                });

                _.each(retData, function(item, metricIndex) {
                    var tmp = _.pluck(data.result, item.id);
                    _.each(tmp, function(num, index) {
                        item.data.push(num);
                    });
                });
            }

            return retData;
        }

        function getYAxis() {
            var yAxisMap = [
                [{
                    title: {
                        text: ''
                    }
                }, {
                    title: {
                        text: ''
                    },
                    opposite: true
                }], {
                    title: {
                        text: ''
                    },
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                }
            ];
            return isMutipleY ? yAxisMap[0] : yAxisMap[1];
        }

        function addAnotation(event) {
            return;
            $('.annotation-container').remove();
            var annotationId; // Todo: fix annotation edit(not found?!)
            if (event.point.marker) {
                var symbol = event.point.marker.symbol;
                var matchAry = symbol.match(/\?id=(\d+)/);
                if (matchAry) {
                    annotationId = matchAry[1];
                }
            }

            var container = $('<div/>').addClass('annotation-container alert fade in')
                .css({
                    left: event.point.pageX,
                    top: event.point.pageY
                });
            var heading = $('<h4/>').addClass('alert-heading')
                .append(this.name);
            var closeBtn = $('<button/>').addClass('close')
                .attr('data-dismiss', 'alert')
                .append('x');

            var textarea = $('<textarea/>').addClass('textarea');
            var saveBtn = $('<button/>').addClass('save btn')
                .append('Save');
            var deleteBtn = $('<a/>')
                .addClass('delete')
                .append('Delete');

            if (annotationId) {
                var annotationInfo = _.find(data.annotations, function(item) {
                    return item.id == annotationId;
                });
                textarea.val(annotationInfo.comment);
                deleteBtn.show();
            } else {
                deleteBtn.hide();
                textarea.val('');
            }

            container.append(closeBtn)
                .append(heading)
                .append(textarea)
                .append(deleteBtn)
                .append(saveBtn);

            $(document.body).append(container);

            saveBtn.on('click', function() {
                // Todo
                var data = {
                    metric: _.find(currentReport.metrics, function(item) {
                        return item.name === this.name;
                    }.bind(this)).id,
                    x_axis: Highcharts.dateFormat('%Y%m%d%H', event.point.x),
                    // period: MuceCom.getCurrentPeriod(),
                    filters: undefined, // MuceCom.stringifyObj(currentData.table_filters)
                    // user: helper.getNameFromCookie(),
                    comment: $('.annotation-container .textarea').val(),
                    type: 'put'
                };
                if (annotationId) {
                    data.id = annotationId;
                    data.type = 'post';
                }
                // apiHelper('addAnnotation', data).then(function() {$('.annotation-container').alert('close');})
            }.bind(this));

        }

        var chartOptions = {
            chart: {
                renderTo: 'highcharts_wrapper',
                type: 'spline',
                zoomType: 'x',
                marginRight: 50,
                events: {
                    click: function(event) {
                        return;
                        // 清理 annotation click popover
                        $('.annotation-container').alert('close');
                    }
                }
            },
            credits: {
                enabled: false
            },
            title: {
                text: currentReport.name,
                x: -20
            },
            subtitle: {
                text: currentReport.comment,
                x: -20
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: getYAxis(),
            tooltip: {
                formatter: formatTip,
                shared: true,
                crosshairs: true
            },
            plotOptions: {
                series: {
                    cursor: 'pointer',
                    events: {
                        click: addAnotation
                    }
                }
            },
            lang: {
                noData: '没有查询到相关数据'
            },
            noData: {
                style: {
                    fontSize: '18px',
                    color: '#303030'
                }
            },
            series: getSeries()
        };

        return new Highcharts.Chart(chartOptions);
    };

    return {
        buildLineChart: buildLineChart
    };
});
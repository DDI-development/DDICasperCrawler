/*
 * Main dispatcher of the JS-part of the new spiders platform
 *
 * (c) 2014 Dmitry Khaleev
 *
 * The Skipper: Kowalski, status report.
 * Kowalski: I'm randomly pushing buttons while we spin out of control, Skipper.
 * The Skipper: Can I push one? I might feel better.
 *
 */

// patch require
global.__require = require;
global.patchRequire = patchRequire; // must be called in every casperjs module as of 1.1
global.require = patchRequire(global.require);
var fs = require('fs');
var system = require('system');
var utils = require('utils');
var casper = require('casper').create({
    verbose:true,
    webSecurity: false,
    logLevel:"error",
//    logLevel:"debug",
    clientScripts: []// ['includes/jquery-1.7.2.min.js']
});

var arguments = [];
var options = {
    'random_delay_up_to':30, //ms
    'random_delay_from_to':10 //ms
};
var status = {};
var spidersList = [];
var spiders_path = fs.workingDirectory+'/spiders/';
var spiderName = null; 
var imagedir= null;
var kw = false;


//read config

//spidersEnabled = fs.list()
//grab input params

function basename(s) {
    var r = s.split('/');
    var last_one = r[r.length-1];
    var matchbox = last_one.match(/^(\w+).*$/);
    if(matchbox === null)
    {
        return false;
    }else{
        return matchbox[1]
    }
}

options.extend = function(obj, defaults) {
    for (var i in defaults) {
        if (!obj[i]) {
            obj[i] = defaults[i];
        } else {
            FC.extend(obj[i], defaults[i]);
        }
    }
};

function generateRandomDelay(options)
{
    var delay = Math.floor((Math.random() * options.random_delay_up_to ) + options.random_delay_from_to);
    return delay;
}

function itemsFeed(casper, spider) {
    if (!spider.item_queue.length) {
        return;
    }
    var l = spider.item_queue.length;
    top:
    for (var j = 0; j < l; j++) {
        casper.then(function(){
        var block = spider.item_queue.pop();
        if(typeof(block) !='undefined')
        {
            var item = block.item;
            item.image_path = imagedir;
            var image_url = item.picture;
            var tmp_name = basename(item.picture);
            if(tmp_name)
            {
                item.picture = tmp_name;
            }else{
                item.picture = item.original_id;
            }
            item.regular_price = new Number(item.regular_price);
            if ((item.reduced_price !== '') && (item.reduced_price !== null)) {
               item.reduced_price = new Number(item.reduced_price);
               if (typeof(item.reduced_price) == 'NaN') {
                   item.reduced_price = '';
               }
            }
            if ((item.headline != '') && typeof(item.regular_price) != 'NaN') {
               casper.then(function(){
                    var delay = generateRandomDelay(options);
                    diag('wait in feed from 1 to '+delay+' ms');
                    casper.wait(delay);
                });
               casper.thenOpen(image_url, function(response){
                   var ctr = response.contentType.split('/');
                   var xts = ctr[ctr.length-1]
                   if(ctr[0] =='text'){
                       item.picture = null;
                   }else{
                       item.picture = item.picture+'_'+item.original_id+'.'+xts;
                       var p = casper.download(image_url, options.imagedir+'/'+item.picture);
                   }
               });
               casper.then(function(){
                   item.kws = block.kws;
                   system.stdout.writeLine(JSON.stringify(item));
               });
            }
            casper.then(function(){
                if (spider.item_queue.length)
                    {
                        itemsFeed(casper, spider);
                    };
            });
        }
    });
    }
}


function crawlSpider(casper, spider) {
    if (spider.link_queue.length > 0) {
        var lnk = spider.link_queue.pop();
        casper.then(function(){
            if(lnk.kws)
            {
                var kws = lnk.kws;
            }else{
                var kws = spider.kws;
            }
            spider.kws = kws;
        });
        casper.then(function(){
            var delay = generateRandomDelay(options);
            diag('wait in crawl from 1 to '+delay+' ms');
            casper.wait(delay);
        });
        casper.then(function(){
           diag('pre_crawl '+lnk.url);
        });
        casper.then(function(){
            if(lnk.url){
                casper.thenOpen(lnk.url, function() {
                    casper.then(function(){ spider.pre_open(casper, lnk)});
                    casper.then(function(){
                        diag('Crawling: '+lnk.url, spider);
                    });
                    casper.then(function(){ lnk.callback(casper, spider, lnk.url, (lnk.kws || spider.kws)); }); //callback -- collect_links
                });
            }
        })
        casper.then(function(){ spider.after_open(casper, spider)});

        casper.then(function(){
            if (spider.item_queue.length) {
                casper.then(function() { itemsFeed(casper, spider); });
            }
        });
        casper.then(function() {
            crawlSpider(casper, spider);
        });
    }else{
        casper.then(function(){
            var status = {
                'spider': Spider.spider.spiderName,
                'status':'finished'
            };
            system.stdout.writeLine(JSON.stringify(status));
        });
    }
}

casper.cli.drop("cli");
casper.cli.drop("casper-path");

var verbose = false;

function diag(message, spider) {
    var obj = {
        'diagnostics': (verbose ? message : ''),
        'link_queue': 0,
        'item_queue': 0
    };
    if (spider) {
        obj['link_queue'] = Number(spider.link_queue.length);
        obj['item_queue'] = Number(spider.item_queue.length);
    }
    system.stdout.writeLine(JSON.stringify(obj));
}

if(casper.cli.args.length === 0 && Object.keys(casper.cli.options).length === 0)
{
    throw "No arguments or options passed";
    casper.exit();
}else{
    arguments = casper.cli.args;
    options.extend(options, casper.cli.options );
    if(typeof options.spider == 'undefined')
    {
        throw "you missed the spider's name";
        casper.exit();        
    }else{
        spiderName = options.spider;
    }
    if(typeof options.imagedir == 'undefined')
    {
        throw "you missed image directory path";
        casper.exit();        
    }else{
        imagedir = options.imagedir;
    }
    if(typeof options.verbose != 'undefined') {
        verbose = true;
    }
}
spidersList = fs.list(spiders_path); 

//check params
var is_found = false;
if (spidersList.indexOf(spiderName+'.js') !== -1) {
    var BaseSpider = require('./BaseSpider.js');
    /*-------------------------*/
    var Spider = require(spiders_path + spiderName + '.js');
    Spider.spider.prototype = BaseSpider.base;
    casper.start('');
    casper.then(function(){
        var status = {
            'spider': Spider.spider.spiderName,
            'status':'started'
        };
        system.stdout.writeLine(JSON.stringify(status));
    });
    casper.then(function() {
        Spider.spider.init(casper, Spider.spider);
    });
    casper.then(function() {
        crawlSpider(casper, Spider.spider);
    });
    casper.run();
} else {
    throw 'Given spider not found';
    casper.exit();
}

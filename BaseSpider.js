//abstract
function BaseSpider(casper){
    this.casper = casper;
    this.spiderName = 'BaseSpider';

    /**
     * You don't normally need to override this method, I'd rather say
     * you never override it.
     *
     * @param casper
     * @param spider
     */
    this.init = function(casper, spider) {
        spider.link_queue = [];
        spider.item_queue = [];
        var q;
        casper.then(function() {
            spider.init_site(casper, spider);
        });
        casper.then(function() {
            q = spider.init_queue(casper, spider);
        });
        casper.then(function() {
            for (var i in q) {
                var chunk = q[i];
                spider.link_queue.push({
                    'url': chunk.link,
                    'callback': spider.collect_links,
                    'kws': chunk.kws
                });
            }
        });
    };

    //item description
    this.item = {
            spider: null,
            original_id : null,
            headline : null,
            description : null,
            regular_price : null,
            reduced_price : null,
            picture : null,
            image_path : null,
            ref_business : null,
            id : null,
            original_url : null,
            currency : null,
            kws: []
    };
    this.kws = [];
    this.params = {
            start_url           : null,
            chunk_selector      : null, //selector that describe each item on page
            details_selector    : null, //common selector to recognize details link
            parse_details       : false, //proceed to details page to grab detailed info
            item_pointer        : 0,
            page_pointer        : 0,
            
    };

    /**
     * This function is where you define the URLs to start crawling.
     * It must return a list of URLs to begin crawling with. No restrictions
     * are put whatsoever on the list size, except that it has to have at least
     * one element.
     *
     * Also note that for 95% of cases you collect your elements using one
     * method per site. So you cannot really make a spider which would use
     * umpteen different ways to collect links on umpteen starting URLs.
     *
     * You should really make umpteen separate spiders, then.
     *
     * IMPORTANT: this function is called AFTER init_site(), so if you need
     * to do nontrivial steps to obtain your links, you can assume that preparatory
     * work is already done.
     *
     */
    this.init_queue = function(casper, spider) {
        throw "You must implement init_queue() to return at least one URL!";
    }

    /**
     * This method you can override to run some preparatory actions on the site:
     * for example, choose language and currency, just to be sure, or find the
     * category you want to find on a site that changes its links very arbitrarily.
     *
     * @param casper
     * @param spider
     */
    this.init_site = function(casper, spider) {
    }

    this.collect_links = function(casper, spider, url, kws) {
        var self = spider;
        var list = [];
        casper.then(function() { self.prepare_page(casper, self) });
        casper.then(function() { list = casper.evaluate(spider.extract_links) || []; });
        casper.then(function() {
            for (var i in list) {
              spider.link_queue.push({
                'url': list[i],
                'callback': spider.get_item,
                'kws': kws
              });
            }
            diag('Collected '+list.length+' links.', self);
            if (spider.hasNextPage(casper)) {
                spider.navigate_next(casper);
            }
        });
    };


    /**
     * For example, inject some JS
     *
     * @param casper
     */
    this.prepare_page = function(casper) {
    };
    this.pre_open = function(casper){
    };
    this.after_open = function(casper, spider){
    };
    this.remove_tags = function (html)
    {
        return html.replace(/<(?:.|\n)*?>/gm, '');
    };

    /**
     * Navigate to the next item and either enqueue it or recurse.
     * You usually just enqueue it if it's a regular link to follow.
     * You recursively call collect_links() if you invoke next page
     * with some cryptic Javascript incantation.
     *
     * @param casper
     */
    this.navigate_next = function(casper) {
        throw "Implement navigate_next()!";
    };


    /**
     * This method tells if there is any page more to parse.
     * Its existence is doubtful because the effort is doubled
     * in navigate_next(). If we find out that the logic is
     * indeed doubled, we'll just get rid of it.
     *
     * @param casper
     * @return Boolean
     */
    this.hasNextPage = function(casper) {
        return false;
    };


    /**
     * This method is called as a callback for getting a single item from the item
     * page. Normally, you don't need to override it.
     *
     * @param casper
     * @param spider
     * @param url
     * @returns {boolean}
     */
    this.get_item = function(casper, spider, url, kws) {
        var self = spider;
        var keywords;
        var item_keywords;
        var result = casper.evaluate(self.extract_item);
        if( Object.prototype.toString.call( result ) === '[object Array]' )
        {
            for(a in result)
            {
                var item = result[a];
                
                if((typeof(item) == 'undefined') || (item == null))
                {
                    continue;
                }
                if((typeof(item.picture) == 'undefined') || (item.headline == ''))
                {
                    continue;
                }
                for (var k in self.item) {
                    if (!(k in item)) {
                        item[k] = self.item[k];
                    }
                }
                if((typeof item.kws !='undefined')&&(item.kws.length>0)){
                    item_keywords = item.kws;
                }else{
                    item_keywords = [];
                }
                keywords = self.kws.concat(item_keywords);
                item.spider = spider.spiderName;
                self.item_queue.push({item:self.process_item(item), kws:keywords});
            }
        }else if(Object.prototype.toString.call( result ) === '[object Object]'){
            if((typeof(result.picture) == 'undefined') || (result.headline == ''))
            {
                return false;
            }
            for (var k in self.item) {
                if (!(k in result)) {
                    result[k] = self.item[k];
                }
            }
            if((typeof result.kws !='undefined')&&(result.kws.length>0)){
                item_keywords = result.kws;
            }else{
                item_keywords = [];
            }
            keywords = self.kws.concat(item_keywords);
            result.spider = spider.spiderName;
            self.item_queue.push({item:self.process_item(result), kws:keywords});
        }
    };

    /**
     * You MUST override this method as it is what looks at the page to figure out the
     * item. It returns the item object, and is passed an item template and spider name,
     * should you need one.
     *
     * It runs in casper.evaluate, so take caution in what's accessible to it and what's not.
     *
     * @param item
     * @param name
     * @returns {*}
     */
    this.extract_item = function (item, name) {
        return item;
    }

    /**
     * Post-process the item returned by extract_item() if you need to massage data using
     * functions from casperjs/your libraries outside the page's context.
     *
     * @param item
     * @returns {*}
     */
    this.process_item = function (item) {
        return item;
    }

    /**
     * This method is run from within the pages containing links we want to use get_item() on.
     * It MUST be overridden. Also, it runs from casper.evaluate(), so in context of the web
     * page itself - take necessary caution.
     */
    this.extract_links = function() {
    };

    this.parseURL = function(url) {
        var a =  document.createElement('a');
        a.href = url;
        return {
            source: url,
            protocol: a.protocol.replace(':',''),
            host: a.hostname,
            port: a.port,
            query: a.search,
            params: (function(){
                var ret = {},
                    seg = a.search.replace(/^\?/,'').split('&'),
                    len = seg.length, i = 0, s;
                for (;i<len;i++) {
                    if (!seg[i]) { continue; }
                    s = seg[i].split('=');
                    ret[s[0]] = s[1];
                }
                return ret;
            })(),
            file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
            hash: a.hash.replace('#',''),
            path: a.pathname.replace(/^([^\/])/,'/$1'),
            relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [,''])[1],
            segments: a.pathname.replace(/^\//,'').split('/')
        };
    };

    //service methods
    this.trimstr = function(s) {
        return s.replace(/^[\s\t\n]+/, '').replace(/[\s\t\n]+$/, '');
    };
    this.normalize_space = function(s) {
     // Replace repeated spaces, newlines and tabs with a single space
     return s.replace(/^\s*|\s(?=\s)|\s*$/g, "");
    };
    this.array_unique = function(a)
    {
        return a.reduce(function(p, c) {
            if (p.indexOf(c) < 0) p.push(c);
            return p;
        }, []);
    };
    this.clone = function(obj)
    {
        var copy;
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;
        // Handle Date
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }
        // Handle Array
        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
            }
            return copy;
        }
        throw new Error("Unable to copy obj! Its type isn't supported.");
    }
    this.sanitizeNumbers = function(val)
    {
       var numberPattern = /\d+/g;
       var arr = val.match(numberPattern);
       if(arr)
       {
           return arr.join('.');
       }
       return false;
    };
    this.sanitizeDescription = function(arg)
    {
        return arg.replace(/\0/, "'");
    };    
    this.getPageTitle = function(){
      return this.casper.evaluate(function(){
//          return $('a.next_page').attr('href');
          return $(document).attr('title');
      });      
    };
    this.injectJquery = function(casper){
        var path = fs.workingDirectory+'/includes/jquery-1.7.2.js';
        return casper.then(function(){
            if(this.page.injectJs(path))
            {
                return true;
            }
            return false;
        });
    }
}

exports.base = new BaseSpider();

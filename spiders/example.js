/**
 * Created by guevara on 7/25/14.
 */

function Spider(){};
Spider.prototype = BaseSpider.base;
Spider.prototype.spiderName = 'example';
Spider.prototype.URL = 'http://www.example.eu';
//Spider.prototype.params = {};
Spider.prototype.item.currency = 'EUR';
Spider.prototype.init_queue = function(casper, spider)
{

    return     [
        {
            'link':'http://www.example.eu/women.html',
            'kws': [
                'shopping:online-stores',
                'shopping:sports',
                'girls-fashion:other'
            ]
        },
        {
            'link':'http://www.example.eu/men.html',
            'kws': [
                'shopping:online-stores',
                'shopping:sports',
                'guys-fashion:other'
            ]
        },
    ]
};
Spider.prototype.init_site = function(casper, spider) {
    casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:32.0) Gecko/20100101 Firefox/32.0');
};
Spider.prototype.extract_links = function()
{
    var links = jQuery('.content-wrapper .main-container .category-products .products-grid .item');
    var batch = Array.prototype.map.call(links, function(e){
        var reduced = jQuery(links[e]).find('.product-box .price-box .special-price span.price').text();
        var regular = jQuery(links[e]).find('.product-box .price-box .old-price span.price').text();
        //pull the discounted items, that have two prices;
        if(
            (typeof(regular) !='undefined') &&
                (typeof(reduced) !='undefined') &&
                (regular.length > 0) &&
                (reduced.length > 0) &&
                (parseFloat(_fixprice(reduced)) < parseFloat(_fixprice(regular)))
            )
        {
            return jQuery(links[e]).find('.product-box .product-img-box a.product-image').attr('href')
        }
    })
    var result = [];
    batch.forEach(function(a){
        if(a != undefined)
        {
            result.push(a);
        }
    })
    //service methods
    function _fixprice(x) {
        x = x.replace(/^[\s\t\n]+/, '').replace(/[\s\t\n]+$/, '');
        x = x.replace(new RegExp('^[^\\d]*(\\d+(?:\\.\\d+)?)[^\\d]*$', ''), '$1').replace(',', '');
        x = x.replace(/^[\D*]*/, '');
        return x
    }
    return result;
};
Spider.prototype.extract_item = function()
{
    var item = {};
    item.headline = normalize_space(jQuery('.content-wrapper .main-container .product-view .product-essential .product-shop .product-name h2').text()).toLowerCase();
    item.description = item.headline;
    item.original_url = jQuery(document).attr('documentURI');
    item.original_id = jQuery('input[name="product"]').val();
    var reduced = jQuery('.content-wrapper .main-container .product-view .product-essential .product-shop .price-box .special-price span.price:first').text();
    var regular = jQuery('.content-wrapper .main-container .product-view .product-essential .product-shop .price-box .old-price span.price:first').text();
    item.regular_price = _fixprice(regular);
    item.reduced_price = _fixprice(reduced);
    var s = jQuery('.content-wrapper .main-container .product-view .product-essential .product-img-box .product-image a#zoom img#image').attr('src');
    if (!s) {
        return [];
    }
    if(
        (s.length === 0) ||
            (item.reduced_price.length == 0) ||
            (item.regular_price.length == 0) ||
            (parseFloat(item.reduced_price) > parseFloat(item.regular_price)) ||
            (parseFloat(item.regular_price) == parseFloat(item.reduced_price))
        ){
        return [];
    }
    item.picture = s;
    item.original_image_url = s;

    // service methods
    //-----------------------------------------------------------------------------------------------------------------------------------------
    //pricer
    function _fixprice(x) {
        x = x.replace(/^[\s\t\n]+/, '').replace(/[\s\t\n]+$/, '');
        x = x.replace(new RegExp('^[^\\d]*(\\d+(?:\\.\\d+)?)[^\\d]*$', ''), '$1').replace(',', '');
        x = x.replace(/^[\D*]*/, '');
        return x
    }
    function _fix_picture_url(s)
    {
        s = s.replace(/^\/{2}/, '');
        return s;
    }
    // Replace repeated spaces, newlines and tabs with a single space
    function normalize_space(s)
    {
        return s.replace(/^\s*|\s(?=\s)|\s*$/g, "");
    }
    return item;
};
Spider.prototype.process_item = function(item)
{
    var self = this;
    item.headline = self.trimstr(self.normalize_space(item.headline));
    item.description = self.trimstr(item.description);
    return item;
};
Spider.prototype.hasNextPage = function()
{
    var next = casper.evaluate(function(){
        function normalize_space(s)
        {
            return s.replace(/^\s*|\s(?=\s)|\s*$/g, "");
        }
        var a = jQuery('.content-wrapper .main-container .pager:first .pages ol li a.next');
        if((normalize_space(a.text()).toLowerCase() == 'next»') && (jQuery(a).attr('href') != undefined))
        {
            return true;
        }
        return false;
    });
    return next;
};
Spider.prototype.navigate_next = function(casper) {
    var spider = this;
    var next = casper.evaluate(function(){
        function normalize_space(s)
        {
            return s.replace(/^\s*|\s(?=\s)|\s*$/g, "");
        }
        var a = jQuery('.content-wrapper .main-container .pager:first .pages ol li a.next');
        if((normalize_space(a.text()).toLowerCase() == 'next»') && (jQuery(a).attr('href') != undefined))
        {
            return jQuery(a).attr('href');
        }
        return false;
    });
    spider.link_queue.push({'url': next, 'callback': spider.collect_links, 'kws': spider.kws});
};
exports.spider = new Spider();


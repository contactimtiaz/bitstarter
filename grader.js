#!/usr/bin/env node

var fs = require('fs');
var url = require('url');
var program = require('commander');
var cheerio = require('cheerio');
var restler = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString(),
        uri = url.parse(instr);
    
    if (!uri.protocol) {
        if(!fs.existsSync(instr)) {
            console.log("%s does not exist. Exiting.", instr);
            process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
        }
    } else if (!/^http(s)?/.test(uri.protocol)) {
        console.log("%s Unknown protocol. Exiting.", uri.protocol);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    
    return instr;
};

var loadHtmlFile = function(htmlfile, callback) {
    var uri = url.parse(htmlfile);
    
    if (uri.protocol) {
        restler.get(htmlfile).on('complete', function(result) {
            if (result instanceof Error)  {
                console.log('Error while loading remote file.');
                return callback(result);
            } 
            
            return callback(null, result);
        });
    } else {
        return fs.readFile(htmlfile, callback);
    }
};

var cheerioHtmlFile = function(htmlfile, callback) {
    loadHtmlFile(htmlfile, function (err, content) {
        if (err) {
            return callback(err);
        }
        
        callback(null, cheerio.load(content.toString()));
    });
}

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile, callback) {
    var $, checks, out, ii;
    
    cheerioHtmlFile(htmlfile, function (err, content) {
        if (err) {
            return callback(err);
        }
        
        $ = content;
        checks = loadChecks(checksfile).sort();
        out = {};
        for(ii in checks) {
            var present = $(checks[ii]).length > 0;
            out[checks[ii]] = present;
        }
        
        callback(null, out);
    });
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    var outJson;
    
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .parse(process.argv);
        
    checkHtmlFile(program.file, program.checks, function (err, checkJson) {
        if (err) {
            console.log(err.message);
            process.exit(1);
        }
        
        outJson = JSON.stringify(checkJson, null, 4);
        
        console.log(outJson);
    });
} else {
    exports.checkHtmlFile = checkHtmlFile;
}

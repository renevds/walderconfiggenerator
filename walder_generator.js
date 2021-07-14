/**
 * This script generates Walder config files from a filestructure
 * Author: René Van Der Schueren
 */

const YAML = require('js-yaml');
const fs = require('fs')
var path = require('path');

/**
 * given parameters
 */
const options = {
    configFile: process.argv[2],
    viewsBasePath: process.argv[3],
    pathsFolder: process.argv[4],
    templateExtension: process.argv[5],
}

/**
 * reads the parent config file
 */
function readParentConfig() {
    try {
        const file = fs.readFileSync(options.configFile, 'utf8');
        return YAML.safeLoad(file);

    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error('The given master config file was not found');
        } else {
            throw err;
        }
    }
}

/**
 * Replaces slashes with correct slashes and removes double slashes
 * @param {string} a - the path
 */
function fixPathSlashes(a) {
    return a.split("\\").join("/").split("//").join("/")
}


/**
 * add Path entry to main Walder config file
 * @param {string} viewPath - The path to the folder containing the view file within the views folder .
 * @param {string} viewName - The name of the the view file without extension.
 * @param {string} pathsFolder - The folder that contains all walder configs.
 */
function addToParentIfNotExisting(viewPath, viewName) {
    let config = readParentConfig();

    const url = viewName === 'index' ? '' : viewName + '/'

    if (!config.hasOwnProperty('paths') || config.paths == null) {
        config.paths = {}
    }

    const pathName = "/" + fixPathSlashes(path.join(viewPath, url).replace(".", ""))

    if (!(pathName in config.paths)) {
        config.paths[pathName] = {'$ref': fixPathSlashes(options.pathsFolder + "/" + viewPath.replace(/^\./, "") + "/" + viewName + ".yaml")}

        let yamlStr = YAML.safeDump(config);
        fs.writeFileSync(options.configFile, yamlStr, 'utf8');

        return true;
    } else {
        console.log("Path already described in parent config file: " + pathName)
        return false;
    }

}

/**
 * genate yaml config string for a certain view
 * @param {string} viewPath - The path to the folder containing the view file within the views folder .
 * * @param {string} viewFile - The full name of the the view file.
 * @param {string} viewName - The name of the the view file without extension.
 */
function generateYaml(viewPath, viewFile, viewName) {
    return "get:\n" +
        `  summary: ${viewName} page\n` +
        "  responses:\n" +
        "    200:\n" +
        `      description: ${viewName} page\n` +
        `      x-walder-input-text/html: ${fixPathSlashes(path.join(viewPath, viewFile))}\n`

}

/**
 * create or add to an existing subconfig
 * @param {string} viewPath - The path to the folder containing the view file within the views folder .
 * @param {string} viewFile - The full name of the the view file.
 * @param {string} viewName - The name of the the view file without extension.
 */

function createOrAddToSubconfigFile(viewPath, viewFile, viewName) {
    const data = generateYaml(viewPath, viewFile, viewName)
    const pathName = options.pathsFolder + ("\\" + viewPath).replace("\\.", "\\") + "\\" + viewName + '.yaml'
    console.log(pathName)
    fs.mkdirSync(options.pathsFolder + "\\" + viewPath, {recursive: true});
    if (fs.existsSync(pathName)) {
        console.log("Path already exists: " + pathName)
    } else {
        fs.writeFileSync(pathName, data, 'utf8');
    }
}


/**
 * Handle a certain view
 * @param {string} viewPath - The path to the folder containing the view file within the views folder .
 * @param {string} viewFile - The full name of the the view file.
 */
function handle(viewPath, viewFile) {
    const viewName = viewFile.split(".")[0]
    if (addToParentIfNotExisting(viewPath, viewName)) {
        createOrAddToSubconfigFile(viewPath, viewFile, viewName)
    }
}

/**
 * Searches for all template files and handles them
 * @param {string} basePath - The path to search for files in .
 */
function handleAllFiles(basePath) {
    var finder = require('findit')(basePath);
    finder.on('file', function (file, stat) {
        if (file.endsWith(options.templateExtension)) {
            console.log(path.dirname(path.relative(options.viewsBasePath, file)));
            handle(path.dirname(path.relative(options.viewsBasePath, file)), path.basename(file))
        }
    });
}

handleAllFiles(options.viewsBasePath)
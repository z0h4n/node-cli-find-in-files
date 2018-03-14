const clear = require('clear');
const inquirer = require('inquirer');
const find = require('find');
const path = require('path');
const fs = require('fs');
const Spinner = new require('cli-spinner').Spinner;
const chalk = require('chalk');
const findInFile = require('find-in-file');
const cliProgress = require('cli-progress');
const opn = require('opn');
const progress = new cliProgress.Bar({
  format: '{bar} {percentage}% | Searching {value} of {total} files',
  hideCursor: true,
  clearOnComplete: true,
}, cliProgress.Presets.shades_classic);

clear();

getDirectory(function (directory) {
  getSearchString(directory, function (search_string) {
    findFiles(directory, search_string, function (files) {
      if (files.length) {
        createLog(function (output_file, write_stream) {
          write_stream.write(`Search Directory : ${directory}\n`);
          write_stream.write(`Search String : ${search_string}\n\n`);
          progress.start(files.length, 0);
          finder(0, 0, 0, directory, files, search_string, write_stream, function (final_message) {
            console.log(`Search Complete - ${final_message}`);
            opn(output_file, { wait: false });
          });
        });
      } else {
        errorMsg(`No files to search in ${directory}`);
      }
    });
  });
});

function createLog(cb) {
  const dir = path.resolve(__dirname, 'results');
  if (fs.existsSync(dir)) {
    const file = `results/${Date.now()}.txt`;
    fs.appendFileSync(file, '');
    cb(file, fs.createWriteStream(file));
  } else {
    fs.mkdirSync(dir);
    createLog(cb);
  }
}

function getDirectory(cb) {
  inquirer.prompt([{ name: 'directory', message: 'Enter the directory to search\n' }]).then(function (response) {
    const directory = path.resolve(response.directory).trim();
    try {
      if (fs.lstatSync(directory).isDirectory()) {
        cb(directory);
      } else {
        errorMsg(`Not a directory - ${directory}`);
        getDirectory(cb);
      }
    } catch (e) {
      errorMsg(`Directory does not exist - ${directory}`);
      getDirectory(cb);
    }
  });
}

function getSearchString(directory, cb) {
  inquirer.prompt([{ name: 'search_string', message: `Enter the text to search\n` }]).then(function (response) {
    cb(response.search_string);
  });
}

function findFiles(directory, search_string, cb) {
  const spinner_1 = new Spinner({
    text: '%s Finding files',
    onTick: function (msg) {
      this.clearLine(this.stream);
      this.stream.write(msg);
    }
  });

  spinner_1.start();

  find.file(directory, function (files) {
    spinner_1.stop(true);
    cb(files);
  }).error(function (err) {
    spinner_1.stop(true);
    console.log(err);
  });
}

function finder(total_file_hits, total_hits, file_index, directory, files, search_string, write_stream, cb) {
  const file = files[file_index];
  findInFile({ files: file, find: search_string }, function (err, matchedFiles) {
    if (err) throw err;

    if (matchedFiles[0]) {
      total_file_hits += 1;
      total_hits += matchedFiles[0].occurrences;
      write_stream.write(`[${matchedFiles[0].occurrences} hits] - ${matchedFiles[0].file.replace(directory, '')}\n`);
    }

    file_index += 1;

    if (file_index === files.length) {
      const final_message = `${total_hits} hits in ${total_file_hits} files`;

      progress.stop();
      write_stream.end(`\n${final_message}`);
      cb(final_message);
    } else {
      progress.update(file_index);
      finder(total_file_hits, total_hits, file_index, directory, files, search_string, write_stream, cb);
    }
  });
}

function errorMsg(msg) {
  console.log(`${chalk.bgRed.white(` ${msg} `)}`);
}
#!/usr/bin/env node

var colors = require('colors');
var argv = require('yargs').argv;

//Setup AWS Object
if (argv.help) {
	getHelp();
} else if (!argv.help && !argv.start && !argv.stop) {
	console.log('[Unrecognisable Command]'.red);
	console.log('For help vpn.js --help'.green);
} else {
	const AWS_DRY_RUN = false;
	var AWS = require('aws-sdk');
	AWS.config = new AWS.Config(require('./aws.js'));

	//Create new ec2 instance & configure
	var instances = require('./ec2.js');
	var ec2 = new AWS.EC2();
	ec2.describeInstances(function (err, data) {
		if (err) console.log('err', err);
		data = (data !== undefined && data.Reservations !== undefined) ? data.Reservations : data;
		var instanceAction = function (params) {
			var _instanceState = params._instanceState;
			var _instanceId = params._instanceId;
			if (instances.indexOf(_instanceId) !== -1) {
				if (_instanceState === 'running' ) {
					if (argv.stop) {
						ec2.stopInstances({
							InstanceIds : [_instanceId],
							DryRun : AWS_DRY_RUN
						}, function (err, result) {
							if (err) console.log('err', err);
							console.log('[stopping] \t'.red + " instance - " + _instanceId);
							ec2.waitFor('instanceStopped', {InstanceIds : [_instanceId]}, function (err, data) {
								if (err) {
									console.log('[error]'.red + '\t ' + err);
								} else {
									console.log('[stopped] \t instance has now stopped');
								}
								process.exit(0);
							});
						});
					} else {
						console.log("[no change]".yellow + "\t instance - " + _instanceId + " is already running");
					}
				} else if (_instanceState === 'stopped') {
					if  (argv.start) {
						ec2.startInstances({
							InstanceIds : [_instanceId],
							DryRun : AWS_DRY_RUN
						}, function (err, result) {
							if (err) console.log('err', err);
							console.log('[starting] \t '.green + "instance - " + _instanceId);
							ec2.waitFor('instanceRunning', {InstanceIds : [_instanceId]}, function (err, data) {
								if (err) {
									console.log('[error]'.red + '\t ' + err);
								} else {
									console.log('[started] \t instance has now started');
								}
								process.exit(0);
							});
						});
					} else {
						console.log("[no change]".yellow + "\t instance - " + _instanceId + " is already stopped");
					}
				}
			}
		}
		var len = (data !== undefined) ? data.length : 0;
		
		//Temp variables
		var _instanceId;
		var _instanceState; 
		while (len--) {
			_instanceId = data[len].Instances[0].InstanceId;
			_instanceState = data[len].Instances[0].State.Name;
			instanceAction({
				_instanceState : _instanceState,
				_instanceId : _instanceId
			});
		}
		// console.log('data', data);
	})
	// console.log('AWS Config', AWS.config);
	// console.log(params);
}

function getHelp () {
	console.log('\n\n\nVPN Starter\n' +'A script to start and stop a VPN Service on EC2\n'
						+ './vpn.js --command \n'.red
								+ 'Command \t\t Description\n'
									+ '--start'.yellow + ' \t Start the VPN\n'
									+ '--stop'.yellow + ' \t\t Stop the VPN\n');
	process.exit(0);
}
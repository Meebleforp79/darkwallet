'use strict';

define(['./module', 'darkwallet', 'util/btc', 'bitcoinjs-lib'],
function (controllers, DarkWallet, BtcUtils, Bitcoin) {
  controllers.controller('NewFundCtrl', ['$scope', 'clipboard', function($scope, clipboard) {
    /**
     * Reset the multisig fund
     */
    $scope.resetMultisigForm = function() {
        $scope.multisig = {
          name: '',
          participants: [],
          m: 1
        };
    };

    // Reset the fund to set initial values
    $scope.resetMultisigForm();


    /**
     * Add a participant from contacts or input
     */
    $scope.addParticipant = function(data, vars) {
        var identity = DarkWallet.getIdentity();
        vars = vars || $scope.multisig;
        var participant = { address: data };

        // Generate an identifying hash
        participant.hash = identity.contacts.generateContactHash(data);

        // Add to scope participants
        vars.participants.push(participant);
    };


    /**
     * Import a multisig
     */
    $scope.importMultisig = function() {
        var identity = DarkWallet.getIdentity();
        var data = clipboard.paste();
        var multiSig = BtcUtils.importMultiSig(data, identity.wallet.versions.p2sh);

        multiSig.pubKeys.forEach(function(participant) {
            var compressed = (participant.length == 33);

            var participant = { address: Bitcoin.convert.bytesToHex(participant),
                                compressed: compressed,
                                fixed: true };

            // Generate an identifying hash
            participant.hash = identity.contacts.generateContactHash(participant.address);

            // Add to scope participants
            $scope.multisig.participants.push(participant);
        });

        $scope.multisig.script = multiSig;
        $scope.multisig.m = multiSig.m;
    };


    /**
     * Create a multisig
     */
    $scope.createMultisig = function() {
        var identity = DarkWallet.getIdentity();
        var participants = [];
        var multisig;
        if ($scope.multisig.script) {
            // TODO: this won't pick up changes since the script was made, careful
            multisig = $scope.multisig.script;
        } else {
            $scope.multisig.participants.forEach(function(participant) {
                // If imported get compressed from original, otherwise, always generate compressed
                var compressed = participant.fixed ? participant.compressed : true;

                // Now push to the list of keys for the multisig
                participants.push(BtcUtils.extractPublicKey(participant.address, compressed));
            });
            // Create the multisig
            multisig = BtcUtils.multiSig(parseInt($scope.multisig.m), participants, identity.wallet.versions.p2sh);
        }
        // Set some extra data on the fund
        multisig.name = $scope.multisig.name;
        multisig.participants = $scope.multisig.participants.slice(0);

        // If successfully created, add to the wallet
        if (multisig.name) {
            var walletAddress = identity.wallet.multisig.addFund(multisig);
            $scope.selectFund(multisig, identity.wallet.multisig.funds.length-1);
            DarkWallet.core.initAddress(walletAddress);
            // clean up scope
            $scope.resetMultisigForm();
        }
    };
  }]);
});

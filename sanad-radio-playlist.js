(function (global) {
    'use strict';

    var SANAD_RADIO_PLAYLIST = {
        stationName: 'إذاعة سند',
        version: '12.6.9',
        tracks: [
            {
                id: 'promo',
                title: 'برومو إذاعة سند',
                url: '/sanad-radio-promo.mp3',
                kind: 'audio',
                type: 'audio/mpeg'
            },
            {
                id: 'seg2',
                title: 'المقطع الثاني -- إذاعة سند',
                url: '/sanad-seg-2.mp3',
                kind: 'audio',
                type: 'audio/mpeg'
            },
            {
                id: 'seg3',
                title: 'فقرة صوتية M4A -- إذاعة سند AI',
                url: '/sanad-seg-3.m4a',
                kind: 'audio',
                type: 'audio/mp4'
            },
            {
                id: 'seg4',
                title: 'حلقة MP4 -- إذاعة سند AI',
                url: '/sanad-seg-4.mp4',
                kind: 'video',
                type: 'video/mp4'
            }
        ]
    };

    global.SANAD_RADIO_PLAYLIST = SANAD_RADIO_PLAYLIST;
})(typeof window !== 'undefined' ? window : globalThis);

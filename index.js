const cardContainer = document.querySelector('.card-container');
const prevButton = document.querySelector('.previous-album');
const nextButton = document.querySelector('.next-album');
const playPauseButton = document.querySelector('.play-pause');
const albumTitle = document.querySelector('.album-title');
const albumArtist = document.querySelector('.album-artist');
const albumYear = document.querySelector('.album-year');
const whatToShowSelect = document.querySelector('#what-to-show');
const appBgVideo = document.querySelector('.app-bg-video');
const appBgYoutube = document.querySelector('.app-bg-youtube');
const subtitleYoutubeLink = document.querySelector('.subtitle-youtube-link');
const DEFAULT_SUBTITLE_YOUTUBE_LINK = 'https://youtube.com/channel/UCGpAOvZxEMF_y3KO_FLnDXA?si=2deG9W-YqOODW6zY';
const BACKGROUND_YOUTUBE_BY_OPTION = {
  standard1: '8pHvK0Tp8bk',
  standard2: 'CRQCqse7Sxo',
  standard3: 'Od_PZx4RNac',
  standard4: 'UbVguQ92Qxs',
};
const BACKGROUND_YOUTUBE_BY_ALBUM_ID = {
  1: 'TZquZFXS9Zk',
  20: 'cWINhE5EEkY',
};
let youtubeIframeApiPromise = null;
const youtubePlayerByIframe = new WeakMap();

const getYoutubeOriginParam = () => {
  if (!window.location.origin || window.location.origin === 'null') return '';
  return window.location.origin;
};

const buildYoutubeEmbedUrl = (videoId, options = {}) => {
  const encodedVideoId = encodeURIComponent(videoId);
  const params = new URLSearchParams({
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    ...options,
  });
  const origin = getYoutubeOriginParam();
  if (origin) params.set('origin', origin);

  return `https://www.youtube.com/embed/${encodedVideoId}?${params.toString()}`;
};

const loadYoutubeIframeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') previousCallback();
      resolve(window.YT);
    };

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });

  return youtubeIframeApiPromise;
};

const getYoutubePlayer = async (iframe) => {
  if (!iframe) return null;

  let playerPromise = youtubePlayerByIframe.get(iframe);
  if (!playerPromise) {
    playerPromise = loadYoutubeIframeApi().then((YT) => new Promise((resolve) => {
      let player = null;
      player = new YT.Player(iframe, {
        events: {
          onReady: () => resolve(player),
        },
      });
    }));
    youtubePlayerByIframe.set(iframe, playerPromise);
  }

  return playerPromise;
};

const syncSubtitleYoutubeLink = () => {
  if (!whatToShowSelect || !subtitleYoutubeLink) return;
  const selectedOption = whatToShowSelect.selectedOptions[0];
  const youtubeId = (selectedOption?.dataset.youtubeId || '').trim();
  subtitleYoutubeLink.href = youtubeId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`
    : DEFAULT_SUBTITLE_YOUTUBE_LINK;
};

const getBackgroundYoutubeEmbedUrl = (videoId) => {
  return buildYoutubeEmbedUrl(videoId, {
    autoplay: '1',
    mute: '1',
    controls: '0',
    loop: '1',
    playlist: videoId,
    modestbranding: '1',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
  });
};

const restoreLocalBackgroundVideo = () => {
  if (!appBgYoutube || !appBgVideo) return;

  youtubePlayerByIframe.delete(appBgYoutube);
  appBgYoutube.src = 'about:blank';
  appBgYoutube.hidden = true;
  document.body.classList.remove('is-bg-card-youtube-active');
  appBgVideo.classList.remove('is-hidden');

  const playPromise = appBgVideo.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
};

const setBackgroundYoutube = (videoId, { reduceDim = false } = {}) => {
  if (!appBgYoutube || !appBgVideo) return;

  if (!videoId) {
    restoreLocalBackgroundVideo();
    return;
  }

  const nextSrc = getBackgroundYoutubeEmbedUrl(videoId);
  if (appBgYoutube.src !== nextSrc) {
    youtubePlayerByIframe.delete(appBgYoutube);
    appBgYoutube.src = nextSrc;
  }

  appBgYoutube.hidden = false;
  document.body.classList.toggle('is-bg-card-youtube-active', reduceDim);
  appBgVideo.pause();
  appBgVideo.classList.add('is-hidden');
};

const syncBackgroundYoutubeBySelection = () => {
  if (!whatToShowSelect) return;
  setBackgroundYoutube(BACKGROUND_YOUTUBE_BY_OPTION[whatToShowSelect.value]);
};

const syncBackgroundYoutubeByAlbumId = (albumId) => {
  const videoId = BACKGROUND_YOUTUBE_BY_ALBUM_ID[String(albumId)];
  if (!videoId) {
    syncBackgroundYoutubeBySelection();
    return;
  }

  setBackgroundYoutube(videoId, { reduceDim: true });
};

const setHeavyBackgroundBlur = (enabled) => {
  if (!document.body) return;
  document.body.classList.toggle('is-bg-blurred', enabled);
};

const setAlbumInfo = (album) => {
  if (!albumTitle || !albumArtist || !albumYear) return;

  albumTitle.textContent = album.title || '제목 미입력';
  albumArtist.textContent = album.artist || '아티스트 미입력';
  albumYear.textContent = album.releaseYear || '발매년도 미입력';
};

const getYoutubeEmbedUrl = (album) => {
  const videoId = album?.youtube?.videoId ? String(album.youtube.videoId).trim() : '';
  if (!videoId) return '';
  return buildYoutubeEmbedUrl(videoId);
};

const buildCard = (album, cloneType = '') => {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = String(album.id);
  card.dataset.clone = cloneType;

  const cardInner = document.createElement('div');
  cardInner.className = 'card-inner';

  const cardFront = document.createElement('div');
  cardFront.className = 'card-face card-front';

  const img = document.createElement('img');
  img.src = album.coverImage;
  img.alt = album.title ? `${album.title} cover` : `Album ${album.id}`;
  img.loading = 'lazy';
  cardFront.appendChild(img);

  const cardBack = document.createElement('div');
  cardBack.className = 'card-face card-back';

  const embedUrl = getYoutubeEmbedUrl(album);
  cardBack.dataset.embedUrl = embedUrl;
  cardBack.dataset.title = album.title || 'album';

  if (!embedUrl) {
    const fallback = document.createElement('div');
    fallback.className = 'card-back-empty';
    fallback.textContent = '재생할 YouTube 링크가 없습니다.';
    cardBack.appendChild(fallback);
  }

  cardInner.appendChild(cardFront);
  cardInner.appendChild(cardBack);
  card.appendChild(cardInner);

  return card;
};

const getCardSize = () => {
  const firstCard = cardContainer?.querySelector('.card');
  if (!cardContainer || !firstCard) return 0;

  const cardStyle = window.getComputedStyle(firstCard);
  const marginLeft = parseFloat(cardStyle.marginLeft) || 0;
  const marginRight = parseFloat(cardStyle.marginRight) || 0;
  return firstCard.offsetWidth + marginLeft + marginRight;
};

const initCarousel = (albums) => {
  if (!cardContainer || !prevButton || !nextButton || albums.length === 0) return;
  let isPlaying = false;
  let backgroundSyncTimer = null;
  let backgroundSyncRunId = 0;

  cardContainer.innerHTML = '';

  const originalCount = albums.length;
  const cloneCount = Math.min(4, originalCount);
  const albumById = new Map(albums.map((album) => [String(album.id), album]));

  if (originalCount > 1) {
    const tailAlbums = albums.slice(originalCount - cloneCount);
    tailAlbums.forEach((album) => cardContainer.appendChild(buildCard(album, 'tail')));
  }

  albums.forEach((album) => cardContainer.appendChild(buildCard(album, 'real')));

  if (originalCount > 1) {
    const headAlbums = albums.slice(0, cloneCount);
    headAlbums.forEach((album) => cardContainer.appendChild(buildCard(album, 'head')));
  }

  const centerCard = (card, behavior = 'auto') => {
    if (!card) return;
    const targetLeft = card.offsetLeft + (card.offsetWidth / 2) - (cardContainer.clientWidth / 2);
    cardContainer.scrollTo({ left: targetLeft, behavior });
  };

  const setPlaybackState = (playing) => {
    isPlaying = playing;
    if (playPauseButton) {
      playPauseButton.textContent = isPlaying ? 'II' : '▶';
    }
    setHeavyBackgroundBlur(isPlaying);
    if (!isPlaying) {
      syncBackgroundYoutubeBySelection();
    }
  };

  const stopBackgroundSync = () => {
    backgroundSyncRunId += 1;
    if (backgroundSyncTimer) {
      window.clearInterval(backgroundSyncTimer);
      backgroundSyncTimer = null;
    }
  };

  const startBackgroundSync = async (cardIframe) => {
    stopBackgroundSync();
    const syncRunId = backgroundSyncRunId;
    if (!cardIframe || !appBgYoutube || appBgYoutube.hidden) return;

    const [cardPlayer, backgroundPlayer] = await Promise.all([
      getYoutubePlayer(cardIframe),
      getYoutubePlayer(appBgYoutube),
    ]);
    if (syncRunId !== backgroundSyncRunId || appBgYoutube.hidden) return;
    if (!cardPlayer || !backgroundPlayer) return;

    const syncPlayers = () => {
      const cardTime = cardPlayer.getCurrentTime?.();
      const backgroundTime = backgroundPlayer.getCurrentTime?.();
      if (!Number.isFinite(cardTime) || !Number.isFinite(backgroundTime)) return;

      if (Math.abs(cardTime - backgroundTime) > 0.35) {
        backgroundPlayer.seekTo(cardTime, true);
      }

      const cardState = cardPlayer.getPlayerState?.();
      const backgroundState = backgroundPlayer.getPlayerState?.();

      if (cardState === 1 && backgroundState !== 1) {
        backgroundPlayer.mute?.();
        backgroundPlayer.playVideo?.();
      } else if ((cardState === 0 || cardState === 2) && backgroundState === 1) {
        backgroundPlayer.pauseVideo?.();
      }
    };

    syncPlayers();
    backgroundSyncTimer = window.setInterval(syncPlayers, 700);
  };

  const createOrUpdateYoutubeIframe = (cardBack, autoplay = false) => {
    if (!cardBack) return null;
    const embedUrl = cardBack.dataset.embedUrl || '';
    if (!embedUrl) return null;

    let iframe = cardBack.querySelector('.youtube-player');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.className = 'youtube-player';
      iframe.title = `${cardBack.dataset.title || 'album'} youtube player`;
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.dataset.baseSrc = embedUrl;
      cardBack.appendChild(iframe);
    }

    const baseSrc = iframe.dataset.baseSrc || embedUrl;
    if (autoplay) {
      const hasQuery = baseSrc.includes('?');
      iframe.src = `${baseSrc}${hasQuery ? '&' : '?'}autoplay=1`;
    } else {
      iframe.src = baseSrc;
    }

    return iframe;
  };

  const destroyYoutubeIframe = (card) => {
    const iframe = card.querySelector('.youtube-player');
    if (!iframe) return;
    iframe.src = 'about:blank';
    iframe.remove();
  };

  const resetFlips = (exceptCard = null) => {
    const cards = Array.from(cardContainer.querySelectorAll('.card'));
    cards.forEach((card) => {
      if (exceptCard && card === exceptCard) return;
      card.classList.remove('is-flipped');
      destroyYoutubeIframe(card);
    });
  };

  const toggleCenterCardPlayback = () => {
    const centeredCard = updateCardFocus();
    if (!centeredCard) return;

    const cardBack = centeredCard.querySelector('.card-back');
    const embedUrl = cardBack?.dataset.embedUrl || '';
    if (!embedUrl) {
      setPlaybackState(false);
      return;
    }

    const willPlay = !centeredCard.classList.contains('is-flipped');
    stopBackgroundSync();
    resetFlips();
    centeredCard.classList.toggle('is-flipped', willPlay);

    if (willPlay) {
      const cardIframe = createOrUpdateYoutubeIframe(cardBack, true);
      syncBackgroundYoutubeByAlbumId(centeredCard.dataset.id);
      startBackgroundSync(cardIframe);
    } else {
      destroyYoutubeIframe(centeredCard);
    }

    setPlaybackState(willPlay);
  };

  const updateCardFocus = () => {
    const cards = Array.from(cardContainer.querySelectorAll('.card'));
    if (!cards.length) return null;

    const viewportCenter = cardContainer.scrollLeft + cardContainer.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    cards.forEach((card, index) => {
      const delta = Math.abs(index - closestIndex);
      card.classList.remove('is-center', 'is-near', 'is-far');

      if (delta === 0) {
        card.classList.add('is-center');
      } else if (delta === 1) {
        card.classList.add('is-near');
      } else if (delta === 2) {
        card.classList.add('is-far');
      }
    });

    return cards[closestIndex] || null;
  };

  const jumpToRealStart = () => {
    const firstRealCard = cardContainer.querySelector('.card[data-clone=\"real\"]');
    centerCard(firstRealCard, 'auto');
    const centeredCard = updateCardFocus();
    const centeredAlbum = centeredCard ? albumById.get(centeredCard.dataset.id) : albums[0];
    if (centeredAlbum) setAlbumInfo(centeredAlbum);
    setPlaybackState(false);
  };

  window.requestAnimationFrame(jumpToRealStart);
  window.addEventListener('load', jumpToRealStart, { once: true });

  let correcting = false;

  const normalizeScroll = () => {
    if (correcting) return;

    let centeredCard = updateCardFocus();
    if (!centeredCard) return;

    if (originalCount > 1) {
      const loopWidth = getCardSize() * originalCount;
      if (!loopWidth) return;

      if (centeredCard.dataset.clone === 'tail') {
        correcting = true;
        cardContainer.scrollLeft += loopWidth;
        correcting = false;
        centeredCard = updateCardFocus() || centeredCard;
      } else if (centeredCard.dataset.clone === 'head') {
        correcting = true;
        cardContainer.scrollLeft -= loopWidth;
        correcting = false;
        centeredCard = updateCardFocus() || centeredCard;
      }
    }

    const centeredAlbum = albumById.get(centeredCard.dataset.id);
    if (centeredAlbum) {
      setAlbumInfo(centeredAlbum);
    }
    resetFlips(centeredCard.classList.contains('is-flipped') ? centeredCard : null);
    if (!centeredCard.classList.contains('is-flipped')) {
      stopBackgroundSync();
    }
    setPlaybackState(centeredCard.classList.contains('is-flipped'));
  };

  const moveByCard = (direction) => {
    const cards = Array.from(cardContainer.querySelectorAll('.card'));
    if (!cards.length) return;

    const centeredCard = updateCardFocus();
    if (!centeredCard) return;

    const currentIndex = cards.indexOf(centeredCard);
    if (currentIndex < 0) return;

    const targetIndex = (currentIndex + direction + cards.length) % cards.length;
    centerCard(cards[targetIndex], 'smooth');
  };

  prevButton.addEventListener('click', () => {
    moveByCard(-1);
  });

  nextButton.addEventListener('click', () => {
    moveByCard(1);
  });

  if (playPauseButton) {
    setPlaybackState(false);
    playPauseButton.addEventListener('click', () => {
      toggleCenterCardPlayback();
    });
  }

  const isInteractiveTarget = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  };

  window.addEventListener('keydown', (event) => {
    if (isInteractiveTarget(event.target)) return;

    if (event.code === 'ArrowRight') {
      event.preventDefault();
      moveByCard(1);
      return;
    }

    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      moveByCard(-1);
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      toggleCenterCardPlayback();
    }
  });

  cardContainer.addEventListener('scroll', normalizeScroll, { passive: true });
  window.addEventListener('resize', () => {
    normalizeScroll();
  });
};

const bootstrap = async () => {
  try {
    if (whatToShowSelect) {
      whatToShowSelect.addEventListener('change', () => {
        syncSubtitleYoutubeLink();
        syncBackgroundYoutubeBySelection();
      });
      syncSubtitleYoutubeLink();
      syncBackgroundYoutubeBySelection();
    }

    const response = await fetch('./best50albums.json');
    if (!response.ok) throw new Error('failed to load album data');

    const albums = await response.json();
    if (!Array.isArray(albums)) throw new Error('invalid album data');

    initCarousel(albums);
  } catch (error) {
    if (albumTitle) albumTitle.textContent = '앨범 데이터를 불러오지 못했습니다.';
    if (albumArtist) albumArtist.textContent = '';
    if (albumYear) albumYear.textContent = '';
    console.error(error);
  }
};

bootstrap();

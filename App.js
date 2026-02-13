import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
  Linking as RNLinking,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { hasSupabaseCredentials, supabase } from './src/supabase';

const LANGUAGES = {
  zh: 'zh',
  en: 'en',
};

const BUCKETS = {
  known: 'known',
  curious: 'curious',
  notInterested: 'not_interested',
};

const COPY = {
  zh: {
    appTitle: 'KnowTok',
    kicker: '随机维基',
    untitled: '未命名词条',
    defaultDescription: '跳出信息茧房，认识你平时不会看的主题。',
    defaultExtract: '这个词条暂时没有摘要。',
    loadingFeed: '正在构建你的探索信息流...',
    loadingProfile: '正在同步账户数据...',
    networkIssue: '网络异常',
    retry: '重试',
    readFullArticle: '阅读全文',
    loadingMore: '加载更多中...',
    langLabel: '语言',
    languageName: '中文',
    switchTo: '切换到 English',
    fallbackUrl: 'https://www.wikipedia.org/',
    loadFailed: '随机词条加载失败，请重试。',
    requestFailedPrefix: 'Wikipedia 请求失败',
    authTitle: '登录后开始探索',
    authHint: '使用邮箱和密码登录或注册。',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '请输入密码（至少 6 位）',
    authSignInTab: '登录',
    authSignUpTab: '注册',
    authSignInAction: '登录',
    authSignUpAction: '注册',
    sending: '提交中...',
    authRequireFields: '请输入邮箱和密码（密码至少 6 位）。',
    signUpSuccessAutoSignIn: '注册成功，已自动登录。',
    signUpSuccessNeedVerify: '注册成功。当前项目开启了邮箱验证，请先验证邮箱后再登录。',
    signOut: '退出登录',
    setupTitle: '缺少 Supabase 配置',
    setupHint: '请在 .env 配置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY。',
    known: '1 已经知道',
    curious: '2 不知道但好奇',
    notInterested: '3 不知道且不感兴趣',
    swipeHint: '左滑=3 右滑=2 上滑=1',
    swipeHintIdle: '向左/右/上滑动，实时预览选择结果',
    swipeHintRelease: '松手即可完成当前选择',
    saveFailed: '保存失败，请稍后重试。',
    savedList: '我的记录',
    closeList: '关闭',
    filterAll: '全部',
    emptySaved: '还没有记录，先滑几条吧。',
  },
  en: {
    appTitle: 'KnowTok',
    kicker: 'RANDOM WIKIPEDIA',
    untitled: 'Untitled',
    defaultDescription: 'Break out of your bubble and discover unfamiliar topics.',
    defaultExtract: 'No summary available for this page.',
    loadingFeed: 'Building your discovery feed...',
    loadingProfile: 'Syncing your account data...',
    networkIssue: 'Network issue',
    retry: 'Retry',
    readFullArticle: 'Read Full Article',
    loadingMore: 'Loading more...',
    langLabel: 'Language',
    languageName: 'English',
    switchTo: 'Switch to 中文',
    fallbackUrl: 'https://www.wikipedia.org/',
    loadFailed: 'Failed to load random pages. Please retry.',
    requestFailedPrefix: 'Wikipedia request failed',
    authTitle: 'Sign in to start exploring',
    authHint: 'Use email and password to sign in or sign up.',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: 'Enter password (min 6 chars)',
    authSignInTab: 'Sign in',
    authSignUpTab: 'Sign up',
    authSignInAction: 'Sign in',
    authSignUpAction: 'Create account',
    sending: 'Submitting...',
    authRequireFields: 'Enter both email and password (min 6 chars).',
    signUpSuccessAutoSignIn: 'Account created. Signed in automatically.',
    signUpSuccessNeedVerify: 'Account created. Email verification is enabled, please verify then sign in.',
    signOut: 'Sign out',
    setupTitle: 'Supabase config missing',
    setupHint: 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
    known: '1 Already know',
    curious: '2 New but curious',
    notInterested: '3 New and not interested',
    swipeHint: 'Swipe left=3 right=2 up=1',
    swipeHintIdle: 'Swipe left/right/up to preview your choice',
    swipeHintRelease: 'Release to confirm this vote',
    saveFailed: 'Save failed. Please retry.',
    savedList: 'My Votes',
    closeList: 'Close',
    filterAll: 'All',
    emptySaved: 'No votes yet. Swipe a few cards first.',
  },
};

const INITIAL_BATCH = 6;
const LOAD_MORE_BATCH = 4;
const HORIZONTAL_SWIPE_THRESHOLD = 88;
const VERTICAL_SWIPE_THRESHOLD = 96;

function getSwipeFeedback(dx, dy) {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx >= absDy) {
    const intent = dx >= 0 ? BUCKETS.curious : BUCKETS.notInterested;
    const progress = Math.min(1, absDx / HORIZONTAL_SWIPE_THRESHOLD);
    return { intent, progress, ready: absDx >= HORIZONTAL_SWIPE_THRESHOLD };
  }

  if (dy < 0) {
    const progress = Math.min(1, absDy / VERTICAL_SWIPE_THRESHOLD);
    return { intent: BUCKETS.known, progress, ready: absDy >= VERTICAL_SWIPE_THRESHOLD };
  }

  return { intent: null, progress: 0, ready: false };
}

function getRandomSummaryUrl(language) {
  const base = language === LANGUAGES.zh ? 'https://zh.wikipedia.org' : 'https://en.wikipedia.org';
  return `${base}/api/rest_v1/page/random/summary`;
}

function normalizeWikiItem(raw, index, language, copy) {
  const rawPageId = raw?.pageid ? String(raw.pageid) : null;
  const fallbackKey = `${raw?.titles?.canonical || raw?.title || 'wiki'}-${Date.now()}-${index}`;
  return {
    id: rawPageId ? `${language}:${rawPageId}` : `${language}:${fallbackKey}`,
    pageId: rawPageId || fallbackKey,
    title: raw?.title || copy.untitled,
    description: raw?.description || copy.defaultDescription,
    extract: raw?.extract || copy.defaultExtract,
    image: raw?.originalimage?.source || raw?.thumbnail?.source || null,
    webUrl: raw?.content_urls?.desktop?.page || copy.fallbackUrl,
    language,
  };
}

async function fetchRandomSummary(index, language, copy) {
  const response = await fetch(getRandomSummaryUrl(language));
  if (!response.ok) {
    throw new Error(`${copy.requestFailedPrefix}: ${response.status}`);
  }
  const data = await response.json();
  return normalizeWikiItem(data, index, language, copy);
}

function SwipeVoteCard({
  item,
  pageHeight,
  copy,
  onVoteAndAdvance,
  renderBucketButton,
  onSwipeActiveChange,
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [swipeIntent, setSwipeIntent] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeReady, setSwipeReady] = useState(false);

  const resetGestureFeedback = useCallback(() => {
    setSwipeIntent(null);
    setSwipeProgress(0);
    setSwipeReady(false);
  }, []);

  const getIntentLabel = useCallback((intent) => {
    if (intent === BUCKETS.curious) return copy.curious;
    if (intent === BUCKETS.notInterested) return copy.notInterested;
    if (intent === BUCKETS.known) return copy.known;
    return copy.swipeHint;
  }, [copy]);

  const swipeHintText = swipeReady
    ? copy.swipeHintRelease
    : swipeIntent
      ? getIntentLabel(swipeIntent)
      : copy.swipeHintIdle;

  const resetPosition = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 7,
      tension: 70,
    }).start(() => {
      onSwipeActiveChange(false);
      resetGestureFeedback();
    });
  }, [onSwipeActiveChange, pan, resetGestureFeedback]);

  const commitVote = useCallback((bucket, xTarget, yTarget) => {
    Animated.timing(pan, {
      toValue: { x: xTarget, y: yTarget },
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      onSwipeActiveChange(false);
      resetGestureFeedback();
      onVoteAndAdvance(item, bucket);
    });
  }, [item, onSwipeActiveChange, onVoteAndAdvance, pan, resetGestureFeedback]);

  const finalizeSwipe = useCallback((dx, dy) => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const exitX = Math.sign(dx || 1) * 420;
    const exitY = -420;

    if (absDx >= HORIZONTAL_SWIPE_THRESHOLD && absDx >= absDy) {
      if (dx < 0) {
        commitVote(BUCKETS.notInterested, exitX, 0);
      } else {
        commitVote(BUCKETS.curious, exitX, 0);
      }
      return;
    }

    if (dy <= -VERTICAL_SWIPE_THRESHOLD && absDy > absDx) {
      commitVote(BUCKETS.known, 0, exitY);
      return;
    }

    resetPosition();
  }, [commitVote, resetPosition]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 6 || Math.abs(dy) > 6;
      },
      onPanResponderGrant: () => {
        onSwipeActiveChange(true);
        resetGestureFeedback();
      },
      onPanResponderMove: (_, gestureState) => {
        const nextY = Math.min(0, gestureState.dy);
        pan.setValue({ x: gestureState.dx, y: nextY });
        const feedback = getSwipeFeedback(gestureState.dx, nextY);
        setSwipeIntent(feedback.intent);
        setSwipeProgress(feedback.progress);
        setSwipeReady(feedback.ready);
      },
      onPanResponderRelease: (_, gestureState) => {
        finalizeSwipe(gestureState.dx, Math.min(0, gestureState.dy));
      },
      onPanResponderTerminate: (_, gestureState) => {
        finalizeSwipe(gestureState.dx, Math.min(0, gestureState.dy));
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const revealRightOpacity = pan.x.interpolate({
    inputRange: [-140, -24, 0],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  });
  const revealLeftOpacity = pan.x.interpolate({
    inputRange: [0, 24, 140],
    outputRange: [0, 0.45, 1],
    extrapolate: 'clamp',
  });
  const revealBottomOpacity = pan.y.interpolate({
    inputRange: [-140, -24, 0],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  });
  const revealLeftScale = pan.x.interpolate({
    inputRange: [0, 70, 180],
    outputRange: [0.92, 1, 1.1],
    extrapolate: 'clamp',
  });
  const revealRightScale = pan.x.interpolate({
    inputRange: [-180, -70, 0],
    outputRange: [1.1, 1, 0.92],
    extrapolate: 'clamp',
  });
  const revealBottomScale = pan.y.interpolate({
    inputRange: [-180, -70, 0],
    outputRange: [1.1, 1, 0.92],
    extrapolate: 'clamp',
  });
  const auraLeftOpacity = pan.x.interpolate({
    inputRange: [0, 100, 210],
    outputRange: [0, 0.16, 0.34],
    extrapolate: 'clamp',
  });
  const auraRightOpacity = pan.x.interpolate({
    inputRange: [-210, -100, 0],
    outputRange: [0.34, 0.16, 0],
    extrapolate: 'clamp',
  });
  const auraTopOpacity = pan.y.interpolate({
    inputRange: [-210, -100, 0],
    outputRange: [0.34, 0.16, 0],
    extrapolate: 'clamp',
  });
  const cardScale = pan.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: [0.984, 1, 0.984],
    extrapolate: 'clamp',
  });

  const meterFillStyle =
    swipeIntent === BUCKETS.notInterested
      ? styles.swipeMeterFillNotInterested
      : swipeIntent === BUCKETS.known
        ? styles.swipeMeterFillKnown
        : styles.swipeMeterFillCurious;

  return (
    <View style={[styles.cardStage, { height: pageHeight }]}>
        <View pointerEvents="none" style={styles.swipeOverlay}>
          <View style={styles.swipeGuide}>
            <Text style={styles.swipeGuideLabel}>{swipeHintText}</Text>
            <View style={styles.swipeMeterTrack}>
              <View
                style={[
                  styles.swipeMeterFill,
                  meterFillStyle,
                  { width: swipeIntent ? `${Math.max(5, Math.round(swipeProgress * 100))}%` : '0%' },
                ]}
              />
            </View>
          </View>

          <Animated.View style={[styles.swipeAura, styles.swipeAuraLeft, { opacity: auraLeftOpacity }]} />
          <Animated.View style={[styles.swipeAura, styles.swipeAuraRight, { opacity: auraRightOpacity }]} />
          <Animated.View style={[styles.swipeAura, styles.swipeAuraTop, { opacity: auraTopOpacity }]} />

          <Animated.View
            style={[styles.swipeBadge, styles.swipeBadgeLeftGap, { opacity: revealLeftOpacity, transform: [{ scale: revealLeftScale }] }]}
          >
            <Text style={styles.swipeBadgeTitle}>RIGHT</Text>
            <Text style={styles.swipeBadgeText}>{copy.curious}</Text>
          </Animated.View>
        <Animated.View
          style={[styles.swipeBadge, styles.swipeBadgeRightGap, { opacity: revealRightOpacity, transform: [{ scale: revealRightScale }] }]}
        >
          <Text style={styles.swipeBadgeTitle}>LEFT</Text>
          <Text style={styles.swipeBadgeText}>{copy.notInterested}</Text>
        </Animated.View>
          <Animated.View
            style={[styles.swipeBadge, styles.swipeBadgeBottomGap, { opacity: revealBottomOpacity, transform: [{ scale: revealBottomScale }] }]}
          >
            <Text style={styles.swipeBadgeTitle}>UP</Text>
            <Text style={styles.swipeBadgeText}>{copy.known}</Text>
          </Animated.View>
        </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.cardSurface,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }, { scale: cardScale }] },
        ]}
      >
        <ImageBackground
          source={item.image ? { uri: item.image } : null}
          resizeMode="cover"
          style={styles.image}
          imageStyle={styles.imageOverlay}
        >
          {!item.image && <View style={styles.emptyBackground} />}
          <View style={styles.gradientLayer} />

          <View style={styles.content}>
            <Text style={styles.kicker}>{copy.kicker}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.extract} numberOfLines={7}>
              {item.extract}
            </Text>

            <TouchableOpacity onPress={() => RNLinking.openURL(item.webUrl)} style={styles.button}>
              <Text style={styles.buttonText}>{copy.readFullArticle}</Text>
            </TouchableOpacity>

            <View style={styles.bucketRow}>
              {renderBucketButton(item, BUCKETS.known, copy.known, 'known')}
              {renderBucketButton(item, BUCKETS.curious, copy.curious, 'curious')}
              {renderBucketButton(item, BUCKETS.notInterested, copy.notInterested, 'notInterested')}
            </View>

            <Text style={[styles.swipeHint, swipeReady && styles.swipeHintReady]}>{swipeHintText}</Text>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [pageHeight, setPageHeight] = useState(Dimensions.get('window').height);
  const [language, setLanguage] = useState(LANGUAGES.zh);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authMode, setAuthMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [isCardSwiping, setIsCardSwiping] = useState(false);
  const [votesByPageId, setVotesByPageId] = useState({});
  const [savedVotes, setSavedVotes] = useState([]);
  const [savedFilter, setSavedFilter] = useState('all');
  const [showSavedList, setShowSavedList] = useState(false);
  const flatListRef = useRef(null);
  const currentIndexRef = useRef(0);
  const knownIdsRef = useRef(new Set());

  const copy = COPY[language];

  const ensureProfile = useCallback(async (userId) => {
    const { data, error: selectError } = await supabase
      .from('profiles')
      .select('language_preference')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (!data) {
      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          language_preference: LANGUAGES.zh,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (upsertError) {
        throw upsertError;
      }
      return LANGUAGES.zh;
    }

    return data.language_preference || LANGUAGES.zh;
  }, []);

  const loadVotes = useCallback(async (userId) => {
    const { data, error: votesError } = await supabase
      .from('feed_votes')
      .select('wiki_page_id,bucket,title,article_url,language,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (votesError) {
      throw votesError;
    }

    const next = {};
    data?.forEach((row) => {
      next[row.wiki_page_id] = row.bucket;
    });
    setVotesByPageId(next);
    setSavedVotes(data || []);
  }, []);

  const bootstrapForUser = useCallback(async (userId) => {
    setProfileLoading(true);
    setError(null);
    try {
      const lang = await ensureProfile(userId);
      setLanguage(lang === LANGUAGES.en ? LANGUAGES.en : LANGUAGES.zh);
      await loadVotes(userId);
    } catch (e) {
      setError(e.message);
    } finally {
      setProfileLoading(false);
    }
  }, [ensureProfile, loadVotes]);

  useEffect(() => {
    if (!hasSupabaseCredentials) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) {
        return;
      }
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        await bootstrapForUser(data.session.user.id);
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setAuthMessage('');
      setVotesByPageId({});
      if (nextSession?.user?.id) {
        await bootstrapForUser(nextSession.user.id);
      }
      if (!nextSession) {
        setLanguage(LANGUAGES.zh);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [bootstrapForUser]);

  const appendUniqueItems = useCallback((incoming) => {
    const unique = incoming.filter((item) => {
      if (knownIdsRef.current.has(item.id)) {
        return false;
      }
      knownIdsRef.current.add(item.id);
      return true;
    });
    if (unique.length > 0) {
      setItems((prev) => [...prev, ...unique]);
    }
  }, []);

  const loadBatch = useCallback(async (count) => {
    const requests = Array.from({ length: count }, (_, i) => fetchRandomSummary(i, language, copy));
    const results = await Promise.allSettled(requests);
    const success = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    if (success.length === 0) {
      throw new Error(copy.loadFailed);
    }

    appendUniqueItems(success);
  }, [appendUniqueItems, copy, language]);

  const bootstrapFeed = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    setLoading(true);
    setError(null);
    knownIdsRef.current.clear();
    setItems([]);

    try {
      await loadBatch(INITIAL_BATCH);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadBatch, session?.user?.id]);

  const loadMore = useCallback(async () => {
    if (!session?.user?.id || loadingMore || loading || error) {
      return;
    }

    setLoadingMore(true);
    try {
      await loadBatch(LOAD_MORE_BATCH);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [error, loadBatch, loading, loadingMore, session?.user?.id]);

  useEffect(() => {
    bootstrapFeed();
  }, [bootstrapFeed, language]);

  const onFeedLayout = useCallback((event) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && Math.abs(nextHeight - pageHeight) > 1) {
      setPageHeight(nextHeight);
    }
  }, [pageHeight]);

  const getItemLayout = useCallback((_, index) => {
    return {
      length: pageHeight,
      offset: pageHeight * index,
      index,
    };
  }, [pageHeight]);

  const onToggleLanguage = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    const next = language === LANGUAGES.zh ? LANGUAGES.en : LANGUAGES.zh;
    setLanguage(next);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ language_preference: next })
      .eq('id', session.user.id);

    if (updateError) {
      setLanguage(language);
      setError(updateError.message);
    }
  }, [language, session?.user?.id]);

  const onSaveBucket = useCallback(async (item, bucket) => {
    if (!session?.user?.id) {
      return;
    }

    const pageKey = `${item.language}:${item.pageId}`;
    const prev = votesByPageId[pageKey];

    setVotesByPageId((current) => ({ ...current, [pageKey]: bucket }));
    setSavedVotes((current) => {
      const existingIndex = current.findIndex((row) => row.wiki_page_id === pageKey);
      const nextRow = {
        wiki_page_id: pageKey,
        bucket,
        title: item.title,
        article_url: item.webUrl,
        language: item.language,
        updated_at: new Date().toISOString(),
      };
      if (existingIndex === -1) {
        return [nextRow, ...current];
      }
      const clone = [...current];
      clone.splice(existingIndex, 1);
      return [nextRow, ...clone];
    });

    const { error: upsertError } = await supabase.from('feed_votes').upsert({
      user_id: session.user.id,
      wiki_page_id: pageKey,
      title: item.title,
      article_url: item.webUrl,
      language: item.language,
      bucket,
    }, { onConflict: 'user_id,wiki_page_id' });

    if (upsertError) {
      setVotesByPageId((current) => ({
        ...current,
        [pageKey]: prev,
      }));
      await loadVotes(session.user.id);
      setError(copy.saveFailed);
    }
  }, [copy.saveFailed, loadVotes, session?.user?.id, votesByPageId]);

  const onSubmitAuth = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setAuthMessage(copy.authRequireFields);
      return;
    }

    setAuthSubmitting(true);
    setAuthMessage('');

    if (authMode === 'signIn') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) {
        setAuthMessage(signInError.message);
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });
      if (signUpError) {
        setAuthMessage(signUpError.message);
      } else {
        setAuthMessage(data.session ? copy.signUpSuccessAutoSignIn : copy.signUpSuccessNeedVerify);
      }
    }

    setAuthSubmitting(false);
  }, [
    authMode,
    copy.authRequireFields,
    copy.signUpSuccessAutoSignIn,
    copy.signUpSuccessNeedVerify,
    email,
    password,
  ]);

  const onSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const goToNextCard = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < items.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: false });
      currentIndexRef.current = nextIndex;
    }
    if (nextIndex >= items.length - 2) {
      loadMore();
    }
  }, [items.length, loadMore]);

  const onVoteAndAdvance = useCallback((item, bucket) => {
    onSaveBucket(item, bucket);
    goToNextCard();
  }, [goToNextCard, onSaveBucket]);

  const onMomentumScrollEnd = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const nextIndex = Math.max(0, Math.round(offsetY / pageHeight));
    currentIndexRef.current = nextIndex;
  }, [pageHeight]);

  const renderBucketButton = useCallback((item, bucket, label, styleType) => {
    const pageKey = `${item.language}:${item.pageId}`;
    const selected = votesByPageId[pageKey] === bucket;

    return (
      <TouchableOpacity
        key={`${pageKey}-${bucket}`}
        style={[
          styles.bucketButton,
          styleType === 'known' && styles.bucketKnown,
          styleType === 'curious' && styles.bucketCurious,
          styleType === 'notInterested' && styles.bucketNotInterested,
          selected && styles.bucketSelected,
        ]}
        onPress={() => onVoteAndAdvance(item, bucket)}
      >
        <Text style={styles.bucketText}>{label}</Text>
      </TouchableOpacity>
    );
  }, [onVoteAndAdvance, votesByPageId]);

  const filteredSavedVotes = savedFilter === 'all'
    ? savedVotes
    : savedVotes.filter((row) => row.bucket === savedFilter);

  const renderItem = useCallback(({ item }) => {
    return (
      <SwipeVoteCard
        item={item}
        pageHeight={pageHeight}
        copy={copy}
        onVoteAndAdvance={onVoteAndAdvance}
        renderBucketButton={renderBucketButton}
        onSwipeActiveChange={setIsCardSwiping}
      />
    );
  }, [copy, onVoteAndAdvance, pageHeight, renderBucketButton, setIsCardSwiping]);

  if (!hasSupabaseCredentials) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ExpoStatusBar style="light" />
        <Text style={styles.errorTitle}>{copy.setupTitle}</Text>
        <Text style={styles.errorText}>{copy.setupHint}</Text>
      </SafeAreaView>
    );
  }

  if (authLoading || profileLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ExpoStatusBar style="light" />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>{copy.loadingProfile}</Text>
      </SafeAreaView>
    );
  }

  if (!session?.user?.id) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ExpoStatusBar style="light" />
        <Text style={styles.authTitle}>{copy.authTitle}</Text>
        <Text style={styles.authHint}>{copy.authHint}</Text>
        <View style={styles.authSwitchRow}>
          <TouchableOpacity
            style={[styles.authSwitchButton, authMode === 'signIn' && styles.authSwitchButtonActive]}
            onPress={() => setAuthMode('signIn')}
          >
            <Text style={styles.authSwitchText}>{copy.authSignInTab}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authSwitchButton, authMode === 'signUp' && styles.authSwitchButtonActive]}
            onPress={() => setAuthMode('signUp')}
          >
            <Text style={styles.authSwitchText}>{copy.authSignUpTab}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={copy.emailPlaceholder}
          placeholderTextColor="#8AA1D3"
        />
        <TextInput
          style={styles.input}
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          placeholder={copy.passwordPlaceholder}
          placeholderTextColor="#8AA1D3"
        />
        <TouchableOpacity style={styles.authBtn} onPress={onSubmitAuth} disabled={authSubmitting}>
          <Text style={styles.buttonText}>
            {authSubmitting
              ? copy.sending
              : authMode === 'signIn'
                ? copy.authSignInAction
                : copy.authSignUpAction}
          </Text>
        </TouchableOpacity>
        {authMessage ? <Text style={styles.authMessage}>{authMessage}</Text> : null}
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ExpoStatusBar style="light" />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>{copy.loadingFeed}</Text>
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ExpoStatusBar style="light" />
        <Text style={styles.errorTitle}>{copy.networkIssue}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={bootstrapFeed} style={styles.retryBtn}>
          <Text style={styles.buttonText}>{copy.retry}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ExpoStatusBar style="light" />

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Text style={styles.brand}>{copy.appTitle}</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={() => setShowSavedList(true)} style={styles.savedButton}>
            <Text style={styles.savedButtonText}>{copy.savedList}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggleLanguage} style={styles.languageButton}>
            <Text style={styles.languageButtonText}>{copy.switchTo}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>{copy.signOut}</Text>
          </TouchableOpacity>
        </View>
      </View>
      

      <FlatList
        ref={flatListRef}
        onLayout={onFeedLayout}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEnabled={!isCardSwiping}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        showsVerticalScrollIndicator={false}
      />

      {loadingMore && !error && (
        <View style={[styles.loadingMoreBadge, { top: insets.top + 54 }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingMoreText}>{copy.loadingMore}</Text>
        </View>
      )}

      {error && items.length > 0 && (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{error}</Text>
          <TouchableOpacity onPress={loadMore}>
            <Text style={styles.inlineRetryText}>{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      )}

      {showSavedList && (
        <View style={styles.savedOverlay}>
          <View style={styles.savedPanel}>
            <View style={styles.savedHeader}>
              <Text style={styles.savedTitle}>{copy.savedList}</Text>
              <TouchableOpacity onPress={() => setShowSavedList(false)} style={styles.savedCloseBtn}>
                <Text style={styles.savedCloseText}>{copy.closeList}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.savedFilterRow}>
              <TouchableOpacity
                style={[styles.savedFilterChip, savedFilter === 'all' && styles.savedFilterChipActive]}
                onPress={() => setSavedFilter('all')}
              >
                <Text style={styles.savedFilterChipText}>{copy.filterAll}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedFilterChip, savedFilter === BUCKETS.known && styles.savedFilterChipActive]}
                onPress={() => setSavedFilter(BUCKETS.known)}
              >
                <Text style={styles.savedFilterChipText}>{copy.known}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedFilterChip, savedFilter === BUCKETS.curious && styles.savedFilterChipActive]}
                onPress={() => setSavedFilter(BUCKETS.curious)}
              >
                <Text style={styles.savedFilterChipText}>{copy.curious}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedFilterChip, savedFilter === BUCKETS.notInterested && styles.savedFilterChipActive]}
                onPress={() => setSavedFilter(BUCKETS.notInterested)}
              >
                <Text style={styles.savedFilterChipText}>{copy.notInterested}</Text>
              </TouchableOpacity>
            </View>

            {filteredSavedVotes.length === 0 ? (
              <View style={styles.savedEmptyWrap}>
                <Text style={styles.savedEmptyText}>{copy.emptySaved}</Text>
              </View>
            ) : (
              <FlatList
                data={filteredSavedVotes}
                keyExtractor={(row) => row.wiki_page_id}
                renderItem={({ item: row }) => (
                  <View style={styles.savedItem}>
                    <Text style={styles.savedItemBucket}>
                      {row.bucket === BUCKETS.known
                        ? copy.known
                        : row.bucket === BUCKETS.curious
                          ? copy.curious
                          : copy.notInterested}
                    </Text>
                    <Text style={styles.savedItemTitle} numberOfLines={2}>
                      {row.title}
                    </Text>
                    {!!row.article_url && (
                      <TouchableOpacity onPress={() => RNLinking.openURL(row.article_url)}>
                        <Text style={styles.savedItemLink}>{copy.readFullArticle}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#060B17',
  },
  cardStage: {
    width: '100%',
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 10,
  },
  cardSurface: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#030914',
    shadowOpacity: 0.52,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageOverlay: {
    opacity: 0.6,
  },
  emptyBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E1830',
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 25, 0.60)',
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  swipeGuide: {
    position: 'absolute',
    top: 82,
    left: 12,
    right: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(3, 8, 20, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  swipeGuideLabel: {
    color: '#E6EEFF',
    fontSize: 12,
    fontWeight: '700',
  },
  swipeMeterTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  swipeMeterFill: {
    height: '100%',
    borderRadius: 999,
  },
  swipeMeterFillKnown: {
    backgroundColor: '#59D3FF',
  },
  swipeMeterFillCurious: {
    backgroundColor: '#FFD171',
  },
  swipeMeterFillNotInterested: {
    backgroundColor: '#FF7E83',
  },
  swipeAura: {
    position: 'absolute',
    borderRadius: 999,
  },
  swipeAuraLeft: {
    right: -110,
    top: '33%',
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 209, 113, 0.58)',
  },
  swipeAuraRight: {
    left: -110,
    top: '33%',
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 126, 131, 0.62)',
  },
  swipeAuraTop: {
    alignSelf: 'center',
    top: -130,
    width: 260,
    height: 260,
    backgroundColor: 'rgba(89, 211, 255, 0.50)',
  },
  swipeBadge: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(5, 12, 26, 0.86)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    minWidth: 126,
    gap: 2,
  },
  swipeBadgeLeftGap: {
    top: '50%',
    marginTop: -22,
    left: 10,
    borderColor: 'rgba(255, 208, 85, 0.92)',
  },
  swipeBadgeRightGap: {
    top: '50%',
    marginTop: -22,
    right: 10,
    borderColor: 'rgba(255, 131, 131, 0.92)',
  },
  swipeBadgeBottomGap: {
    bottom: 14,
    alignSelf: 'center',
    borderColor: 'rgba(94, 193, 247, 0.92)',
  },
  swipeBadgeTitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  swipeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    zIndex: 2,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  kicker: {
    color: '#89A8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  desc: {
    color: '#D6E1FF',
    fontSize: 15,
    fontWeight: '600',
  },
  extract: {
    color: '#E7EEFF',
    fontSize: 16,
    lineHeight: 23,
  },
  button: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#D84727',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  bucketRow: {
    marginTop: 6,
    gap: 8,
  },
  swipeHint: {
    color: '#D6E1FF',
    fontSize: 12,
    opacity: 0.96,
  },
  swipeHintReady: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bucketButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(6,11,23,0.55)',
  },
  bucketKnown: {
    borderColor: 'rgba(94, 193, 247, 0.50)',
  },
  bucketCurious: {
    borderColor: 'rgba(255, 208, 85, 0.65)',
  },
  bucketNotInterested: {
    borderColor: 'rgba(255, 131, 131, 0.65)',
  },
  bucketSelected: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderColor: '#FFFFFF',
  },
  bucketText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedButton: {
    backgroundColor: 'rgba(6, 11, 23, 0.72)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  savedButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  languageButton: {
    backgroundColor: 'rgba(6, 11, 23, 0.72)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutButton: {
    backgroundColor: 'rgba(216, 71, 39, 0.95)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingMoreBadge: {
    position: 'absolute',
    top: 58,
    right: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 11, 23, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: '#D5DEF8',
    fontSize: 12,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060B17',
    paddingHorizontal: 24,
    gap: 14,
  },
  loadingText: {
    color: '#D0DDFF',
    fontSize: 16,
    textAlign: 'center',
  },
  authTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  authHint: {
    color: '#C8D7FD',
    textAlign: 'center',
    fontSize: 14,
  },
  authSwitchRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  authSwitchButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(14, 24, 48, 0.55)',
  },
  authSwitchButtonActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  authSwitchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    borderRadius: 10,
    borderColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    color: '#fff',
    backgroundColor: 'rgba(14, 24, 48, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  authBtn: {
    width: '100%',
    backgroundColor: '#D84727',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  authMessage: {
    color: '#D7E2FF',
    textAlign: 'center',
    fontSize: 13,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  errorText: {
    color: '#D7E2FF',
    textAlign: 'center',
    fontSize: 15,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#D84727',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inlineError: {
    position: 'absolute',
    right: 16,
    left: 16,
    bottom: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(216, 71, 39, 0.90)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineErrorText: {
    color: '#fff',
    fontSize: 12,
    maxWidth: '75%',
  },
  inlineRetryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  savedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-end',
  },
  savedPanel: {
    maxHeight: '72%',
    backgroundColor: '#0C1326',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 22,
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  savedTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  savedCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  savedCloseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  savedFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  savedFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  savedFilterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: '#fff',
  },
  savedFilterChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  savedEmptyWrap: {
    paddingVertical: 26,
    alignItems: 'center',
  },
  savedEmptyText: {
    color: '#D5DEF8',
    fontSize: 14,
  },
  savedItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 4,
  },
  savedItemBucket: {
    color: '#A8C1FF',
    fontSize: 11,
    fontWeight: '700',
  },
  savedItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  savedItemLink: {
    color: '#89A8FF',
    fontSize: 12,
    fontWeight: '700',
  },
});

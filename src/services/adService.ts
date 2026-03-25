import { Capacitor } from '@capacitor/core';
import { ADS_CONFIG } from '../adsConfig';
import { 
  BannerAdOptions, 
  BannerAdSize, 
  BannerAdPosition, 
  RewardAdOptions,
  RewardAdPluginEvents,
  AdOptions
} from '@capacitor-community/admob';

// IDs de teste da Google para desenvolvimento
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

const isNative = () => {
  try {
    return Capacitor && Capacitor.getPlatform() !== 'web';
  } catch (e) {
    return false;
  }
};

export const initAdMob = async () => {
  if (!isNative()) return;
  
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: ADS_CONFIG.isTesting,
    });
    // Solicitar autorização de rastreamento (iOS)
    await AdMob.requestTrackingAuthorization();
  } catch (error) {
    console.error("Erro ao inicializar AdMob:", error);
  }
};

export const showBanner = async () => {
  if (!isNative()) return;

  const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
  const options: BannerAdOptions = {
    adId: ADS_CONFIG.isTesting ? TEST_BANNER_ID : ADS_CONFIG.bannerAdUnitId,
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: ADS_CONFIG.isTesting,
  };

  try {
    await AdMob.showBanner(options);
  } catch (error) {
    console.error("Erro ao mostrar banner:", error);
  }
};

export const hideBanner = async () => {
  if (!isNative()) return;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.hideBanner();
  } catch (error) {
    console.error("Erro ao esconder banner:", error);
  }
};

export const showInterstitial = async () => {
  if (!isNative()) return;

  const { AdMob } = await import('@capacitor-community/admob');
  const options: AdOptions = {
    adId: ADS_CONFIG.isTesting ? TEST_INTERSTITIAL_ID : ADS_CONFIG.interstitialAdUnitId,
    isTesting: ADS_CONFIG.isTesting,
  };

  try {
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
  } catch (error) {
    console.error("Erro ao mostrar intersticial:", error);
  }
};

export const showRewarded = async (onReward: (amount: number) => void) => {
  if (!isNative()) {
    // Mock para web
    onReward(1);
    return;
  }

  const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
  const options: RewardAdOptions = {
    adId: ADS_CONFIG.isTesting ? TEST_REWARDED_ID : ADS_CONFIG.rewardedAdUnitId,
    isTesting: ADS_CONFIG.isTesting,
  };

  try {
    await AdMob.prepareRewardVideoAd(options);
    
    const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
      onReward(reward.amount);
      rewardListener.remove();
    });

    await AdMob.showRewardVideoAd();
  } catch (error) {
    console.error("Erro ao mostrar recompensado:", error);
  }
};

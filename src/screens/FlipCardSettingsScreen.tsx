import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppText from '../components/AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import { useExpenseContext } from '../context/ExpenseContext';
import { useAlert } from '../context/AlertContext';
import {
  DashboardCardId,
  FlipCardPair,
  AVAILABLE_DASHBOARD_CARDS,
  DEFAULT_FLIP_CARD_CONFIG,
} from '../types/flipCard';

export default function FlipCardSettingsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { showAlert } = useAlert();
  const { flipCardConfig, updateFlipCardConfig, toggleFlipCardEnabled } = useExpenseContext();

  // Picker modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeTarget, setActiveTarget] = useState<{
    pairId: string;
    side: 'front' | 'back';
  } | null>(null);

  const getCardMeta = useCallback((cardId: string) => {
    return AVAILABLE_DASHBOARD_CARDS.find((c) => c.id === cardId);
  }, []);

  // Compute all card IDs currently assigned in any pair
  const assignedCardIds = useMemo(() => {
    const ids = new Set<string>();
    flipCardConfig.pairs.forEach((pair) => {
      if (pair.frontCardId) ids.add(pair.frontCardId);
      if (pair.backCardId) ids.add(pair.backCardId);
    });
    return ids;
  }, [flipCardConfig.pairs]);

  // Compute available unassigned cards for adding a new pair
  const unassignedCards = useMemo(() => {
    return AVAILABLE_DASHBOARD_CARDS.filter((c) => !assignedCardIds.has(c.id));
  }, [assignedCardIds]);

  // Options available for the active picker (excluding cards in other pairs and the counterpart side)
  const availableOptionsForPicker = useMemo(() => {
    if (!activeTarget) return [];
    const currentPair = flipCardConfig.pairs.find((p) => p.id === activeTarget.pairId);
    if (!currentPair) return [];

    const otherSideCardId =
      activeTarget.side === 'front' ? currentPair.backCardId : currentPair.frontCardId;

    return AVAILABLE_DASHBOARD_CARDS.filter((c) => {
      // Must not be the card on the other side of this pair
      if (c.id === otherSideCardId) return false;
      // If used in another pair, exclude it
      if (assignedCardIds.has(c.id)) {
        // Allow the card currently assigned to this side
        const currentCardOnThisSide =
          activeTarget.side === 'front' ? currentPair.frontCardId : currentPair.backCardId;
        return c.id === currentCardOnThisSide;
      }
      return true;
    });
  }, [activeTarget, flipCardConfig.pairs, assignedCardIds]);

  // Master switch handler
  const handleToggleEnable = async (val: boolean) => {
    await toggleFlipCardEnabled(val);
  };

  // Add new flip card pair
  const handleAddPair = async () => {
    if (unassignedCards.length < 2) {
      showAlert('Notice', 'You need at least 2 unassigned cards to create a new flip card.');
      return;
    }

    const newPair: FlipCardPair = {
      id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      frontCardId: unassignedCards[0].id,
      backCardId: unassignedCards[1].id,
    };

    const updatedPairs = [...flipCardConfig.pairs, newPair];
    await updateFlipCardConfig({
      ...flipCardConfig,
      pairs: updatedPairs,
    });
  };

  // Delete a flip card pair
  const handleDeletePair = (pairId: string) => {
    showAlert('Remove Flip Card', 'Are you sure you want to remove this flip card? Both cards will be shown separately on the dashboard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedPairs = flipCardConfig.pairs.filter((p) => p.id !== pairId);
          await updateFlipCardConfig({
            ...flipCardConfig,
            pairs: updatedPairs,
          });
        },
      },
    ]);
  };

  // Swap front and back sides of a pair
  const handleSwapSides = async (pairId: string) => {
    const updatedPairs = flipCardConfig.pairs.map((p) => {
      if (p.id === pairId) {
        return {
          ...p,
          frontCardId: p.backCardId,
          backCardId: p.frontCardId,
        };
      }
      return p;
    });

    await updateFlipCardConfig({
      ...flipCardConfig,
      pairs: updatedPairs,
    });
  };

  // Open picker modal
  const handleOpenPicker = (pairId: string, side: 'front' | 'back') => {
    setActiveTarget({ pairId, side });
    setPickerModalVisible(true);
  };

  // Select card from picker
  const handleSelectCard = async (cardId: DashboardCardId) => {
    if (!activeTarget) return;

    const updatedPairs = flipCardConfig.pairs.map((p) => {
      if (p.id === activeTarget.pairId) {
        return {
          ...p,
          [activeTarget.side === 'front' ? 'frontCardId' : 'backCardId']: cardId,
        };
      }
      return p;
    });

    await updateFlipCardConfig({
      ...flipCardConfig,
      pairs: updatedPairs,
    });

    setPickerModalVisible(false);
    setActiveTarget(null);
  };

  // Reset to default pairs
  const handleResetToDefaults = () => {
    showAlert(
      'Reset Flip Cards',
      'Reset flip cards to default setup? (Monthly/Yearly Spending & Monthly/Yearly Chart)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await updateFlipCardConfig({
              ...flipCardConfig,
              pairs: DEFAULT_FLIP_CARD_CONFIG.pairs,
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle Section */}
        <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.masterRow}>
            <View style={styles.masterInfo}>
              <View style={styles.titleRow}>
                <Ionicons name="swap-horizontal" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                <AppText style={[styles.masterTitle, { color: colors.text }]}>
                  Enable Flip Cards
                </AppText>
              </View>
              <AppText style={[styles.masterSubtitle, { color: colors.textMuted }]}>
                Combine paired dashboard cards into a single 3D flip card with a tap.
              </AppText>
            </View>
            <Switch
              value={flipCardConfig.isEnabled}
              onValueChange={handleToggleEnable}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={flipCardConfig.isEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {flipCardConfig.isEnabled && (
          <>
            {/* Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
              <AppText style={[styles.infoBannerText, { color: colors.text }]}>
                Front side is always shown by default. Tapping the flip icon on the card smoothly reveals the back side.
              </AppText>
            </View>

            {/* Configured Pairs Section */}
            <View style={styles.sectionHeaderRow}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>
                Configured Flip Cards ({flipCardConfig.pairs.length})
              </AppText>
              {flipCardConfig.pairs.length > 0 && (
                <TouchableOpacity onPress={handleResetToDefaults} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <AppText style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    Reset Defaults
                  </AppText>
                </TouchableOpacity>
              )}
            </View>

            {flipCardConfig.pairs.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="albums-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <AppText style={[styles.emptyTitle, { color: colors.text }]}>
                  No Flip Cards Added
                </AppText>
                <AppText style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Tap the button below to create your first flip card pair.
                </AppText>
              </View>
            ) : (
              flipCardConfig.pairs.map((pair, index) => {
                const frontMeta = getCardMeta(pair.frontCardId);
                const backMeta = getCardMeta(pair.backCardId);

                return (
                  <View
                    key={pair.id}
                    style={[
                      styles.pairCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    {/* Pair Card Header */}
                    <View style={[styles.pairHeader, { borderBottomColor: colors.border }]}>
                      <View style={styles.pairHeaderLeft}>
                        <View style={[styles.pairNumberBadge, { backgroundColor: colors.primary }]}>
                          <AppText style={styles.pairNumberText}>{index + 1}</AppText>
                        </View>
                        <AppText style={[styles.pairTitle, { color: colors.text }]}>
                          Flip Card #{index + 1}
                        </AppText>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeletePair(pair.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={19} color="#ff4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Front & Back Sides Container */}
                    <View style={styles.sidesContainer}>
                      {/* Front Side */}
                      <TouchableOpacity
                        style={[
                          styles.sideSlot,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleOpenPicker(pair.id, 'front')}
                      >
                        <View style={styles.sideLabelRow}>
                          <View style={[styles.sideTag, { backgroundColor: `${colors.primary}20` }]}>
                            <AppText style={[styles.sideTagText, { color: colors.primary }]}>
                              Front (Default)
                            </AppText>
                          </View>
                          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
                        </View>
                        <View style={styles.sideCardInfo}>
                          <Ionicons
                            name={(frontMeta?.icon as any) || 'document-outline'}
                            size={20}
                            color={colors.primary}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <AppText style={[styles.cardNameText, { color: colors.text }]} numberOfLines={1}>
                              {frontMeta?.name || 'Select Front Card'}
                            </AppText>
                            <AppText style={[styles.cardCategoryText, { color: colors.textMuted }]}>
                              {frontMeta?.category || 'Tap to choose'}
                            </AppText>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Swap Button Divider */}
                      <View style={styles.swapDividerRow}>
                        <View style={[styles.swapLine, { backgroundColor: colors.border }]} />
                        <TouchableOpacity
                          style={[styles.swapButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => handleSwapSides(pair.id)}
                          activeOpacity={0.75}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="swap-vertical" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <View style={[styles.swapLine, { backgroundColor: colors.border }]} />
                      </View>

                      {/* Back Side */}
                      <TouchableOpacity
                        style={[
                          styles.sideSlot,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleOpenPicker(pair.id, 'back')}
                      >
                        <View style={styles.sideLabelRow}>
                          <View style={[styles.sideTag, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                            <AppText style={[styles.sideTagText, { color: '#10B981' }]}>
                              Back Side
                            </AppText>
                          </View>
                          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
                        </View>
                        <View style={styles.sideCardInfo}>
                          <Ionicons
                            name={(backMeta?.icon as any) || 'document-outline'}
                            size={20}
                            color="#10B981"
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <AppText style={[styles.cardNameText, { color: colors.text }]} numberOfLines={1}>
                              {backMeta?.name || 'Select Back Card'}
                            </AppText>
                            <AppText style={[styles.cardCategoryText, { color: colors.textMuted }]}>
                              {backMeta?.category || 'Tap to choose'}
                            </AppText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* Add Flip Card Button */}
            {unassignedCards.length >= 2 ? (
              <TouchableOpacity
                style={[styles.addPairBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddPair}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <AppText style={styles.addPairBtnText}>Add Flip Card</AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.allPairedNotice}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                <AppText style={[styles.allPairedText, { color: colors.textMuted }]}>
                  All available dashboard cards are currently paired.
                </AppText>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Card Selector Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPickerModalVisible(false);
          setActiveTarget(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <AppText style={[styles.modalTitle, { color: colors.text }]}>
                  Choose {activeTarget?.side === 'front' ? 'Front' : 'Back'} Card
                </AppText>
                <AppText style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Each card can only be assigned to one flip card.
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setPickerModalVisible(false);
                  setActiveTarget(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {availableOptionsForPicker.map((item) => {
                const currentPair = flipCardConfig.pairs.find(
                  (p) => p.id === activeTarget?.pairId
                );
                const isSelected =
                  activeTarget?.side === 'front'
                    ? currentPair?.frontCardId === item.id
                    : currentPair?.backCardId === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.pickerOptionRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected ? `${colors.primary}15` : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelectCard(item.id)}
                  >
                    <View style={[styles.pickerIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                      <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={[styles.pickerItemName, { color: colors.text }]}>
                        {item.name}
                      </AppText>
                      <AppText style={[styles.pickerItemCategory, { color: colors.textMuted }]}>
                        {item.category}
                      </AppText>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardGroup: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterInfo: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  masterTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  masterSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  pairCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pairHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pairNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pairTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sidesContainer: {
    padding: 12,
  },
  sideSlot: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  sideLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sideTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sideTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sideCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNameText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardCategoryText: {
    fontSize: 12,
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  swapLine: {
    flex: 1,
    height: 1,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  addPairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  addPairBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  allPairedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  allPairedText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerItemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerItemCategory: {
    fontSize: 12,
  },
});

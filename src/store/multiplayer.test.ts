import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';

describe('Multiplayer Sync Logic Protocol', () => {
  beforeEach(() => {
    useGameStore.getState().initGame('Normal', 'TESTS', 'Testing logic', true, 'ROOM_123', true);
  });

  it('should correctly map synced presence state to local player list', () => {
    const store = useGameStore.getState();
    const mockPresenceState = [
      { id: 'me', name: 'HOST_NODE', isHost: true, isReady: true },
      { id: 'guest_1', name: 'GUEST_NODE', isHost: false, isReady: true }
    ];
    
    store.setPlayers(mockPresenceState);
    expect(useGameStore.getState().players.length).toBe(2);
    expect(useGameStore.getState().players[1].id).toBe('guest_1');
  });

  it('should update specific player grid without affecting others', () => {
    const store = useGameStore.getState();
    store.setPlayers([
      { id: 'me', name: 'HOST', isHost: true, isReady: true },
      { id: 'opponent', name: 'OPPONENT', isHost: false, isReady: true }
    ]);

    store.updatePlayerGrid('opponent', ['APPLE'], 'MAN');
    
    const updatedOpponent = useGameStore.getState().players.find(p => p.id === 'opponent');
    expect(updatedOpponent?.gridState).toEqual(['APPLE']);
    expect(updatedOpponent?.currentGuess).toBe('MAN');
    
    const me = useGameStore.getState().players.find(p => p.id === 'me');
    expect(me?.gridState).toEqual([]);
  });

  it('should identify allPlayersReady correctly', () => {
    // This requires checking logic in App.tsx typically, 
    // but we can verify the store state allows for the calculation.
    const store = useGameStore.getState();
    store.setPlayers([
      { id: 'me', name: 'HOST', isHost: true, isReady: true },
      { id: 'guest', name: 'GUEST', isHost: false, isReady: false }
    ]);
    
    let allReady = useGameStore.getState().players.every(p => p.isReady) && useGameStore.getState().players.length > 1;
    expect(allReady).toBe(false);

    store.setReady('guest', true);
    allReady = useGameStore.getState().players.every(p => p.isReady) && useGameStore.getState().players.length > 1;
    expect(allReady).toBe(true);
  });
});

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useUnreadMessages } from '@/lib/unreadMessages';
import { Modal } from '@/components/Modal';
import { Spinner, EmptyState } from '@/components/Feedback';
import { timeAgo } from '@/lib/constants';
import type { Channel, Message, Profile } from '@/lib/types';
import {
  listChannels as dbListChannels,
  createChannel as dbCreateChannel,
  addChannelMember as dbAddChannelMember,
  listMessages as dbListMessages,
  sendMessage as dbSendMessage,
  listUsersByOrg,
  type ChannelDbRow,
  type MessageDbRow,
} from '@/lib/api';
import { subscribeToChanges, notifyDbChange } from '@/lib/realtime';
import { Hash, Send, MessageSquare, ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';

function toChannel(r: ChannelDbRow): Channel {
  return {
    id: r.id,
    name: r.name,
    type: r.type.toLowerCase() as Channel['type'],
    created_at: r.created_at,
    organization_id: r.organization_id
  };
}

function toMessage(r: MessageDbRow): Message {
  return {
    id: r.id,
    channel_id: r.channel_id,
    sender_id: r.sender_id,
    content: r.content,
    created_at: r.created_at,
    sender: r.sender ? {
      id: r.sender.id,
      full_name: r.sender.full_name,
      email: r.sender.email,
      phone: (r.sender as unknown as { phone?: string | null })?.phone ?? null,
      role: ((r.sender as unknown as { role?: string })?.role ?? 'technician') as Profile['role'],
      status: ((r.sender as unknown as { status?: string })?.status ?? 'active') as Profile['status'],
      organization_id: (r.sender as unknown as { organization_id?: string | null })?.organization_id ?? null,
      avatar_url: (r.sender as unknown as { avatar_url?: string | null })?.avatar_url ?? null,
      created_at: (r.sender as unknown as { created_at?: string })?.created_at ?? new Date().toISOString(),
    } : undefined,
  };
}

export function TechMessages() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { isChannelUnread, markChannelRead, lastMessages } = useUnreadMessages();
  const orgId = profile?.organization_id ?? 'default-org';
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showChannelList, setShowChannelList] = useState(true);
  const [showNewDM, setShowNewDM] = useState(false);
  const [creatingDM, setCreatingDM] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dmDisplayName = useCallback((ch: Channel | undefined) => {
    if (!ch || !profile) return '';
    if (ch.type === 'group') return ch.name;
    return ch.name.replace(/^DM:\s*/, '').split(' ↔ ').find((n) => n !== profile.full_name) ?? ch.name;
  }, [profile]);

  const loadChannels = useCallback(async () => {
    if (!user) return;
    try {
      const [chRows, profRows] = await Promise.all([
        dbListChannels(orgId),
        listUsersByOrg(orgId),
      ]);
      const mappedChannels = chRows.map(toChannel);
      const mappedProfiles: Profile[] = profRows.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        role: p.role,
        status: p.status,
        organization_id: p.organization_id,
        avatar_url: p.avatar_url ?? null,
        created_at: p.created_at,
      }));
      setChannels(mappedChannels);
      setProfiles(mappedProfiles);
      setActiveChannel((prev) => prev ?? (mappedChannels.length > 0 ? mappedChannels[0].id : null));
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    }
  }, [user, orgId, toast]);

  const loadMessages = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const rows = await dbListMessages(activeChannel);
      const mapped = rows.map(toMessage);
      setMessages(mapped);
      if (mapped.length > 0) {
        markChannelRead(activeChannel, mapped[mapped.length - 1].created_at);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    }
  }, [activeChannel, toast, markChannelRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (activeChannel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMessages();
    }
  }, [activeChannel, loadMessages]);

  // Temps réel
  useEffect(() => {
    if (!activeChannel) return;
    const unsub = subscribeToChanges(() => loadMessages());
    return () => { unsub(); };
  }, [activeChannel, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const channelMetas = channels.map((ch) => {
    const lastMsg = lastMessages[ch.id] ?? null;
    const unread = isChannelUnread(ch.id);
    return { channel: ch, lastMessage: lastMsg, unreadCount: unread ? 1 : 0, displayName: dmDisplayName(ch) };
  }).sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChannel || !user) return;
    const content = newMsg.trim();
    setNewMsg('');
    setSending(true);
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      channel_id: activeChannel,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: profile ? { ...profile } : undefined,
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      await dbSendMessage(activeChannel, user.id, content);
      notifyDbChange();
      await loadMessages();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'envoi.';
      toast(msg, 'error');
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setNewMsg(content);
    } finally {
      setSending(false);
    }
  };

  const createDM = async (targetId: string) => {
    if (!user || !profile) return;
    const target = profiles.find((p) => p.id === targetId);
    if (!target) return;

    const existingDM = channels.find(
      (c) => c.type === 'dm' && c.name.includes(target.full_name) && c.name.includes(profile.full_name)
    );
    if (existingDM) {
      setActiveChannel(existingDM.id);
      setShowNewDM(false);
      setShowChannelList(false);
      return;
    }

    setCreatingDM(true);
    try {
      const dmName = `DM: ${profile.full_name} ↔ ${target.full_name}`;
      const chId = await dbCreateChannel(orgId, dmName, 'dm', targetId);
      await dbAddChannelMember(chId, user.id);
      await dbAddChannelMember(chId, targetId);
      notifyDbChange();
      toast('Discussion privée créée.', 'success');
      setShowNewDM(false);
      await loadChannels();
      setActiveChannel(chId);
      setShowChannelList(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de création.';
      toast(msg, 'error');
    } finally {
      setCreatingDM(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={24} /></div>;
  }

  const activeCh = channels.find((c) => c.id === activeChannel);
  const availableUsers = profiles.filter((p) => p.id !== user?.id && p.status === 'active');

  return (
    <div className="card flex h-[calc(100vh-10rem)] min-h-[400px] overflow-hidden">
      {/* Channel list */}
      <div className={`w-40 sm:w-52 border-r border-white/[0.06] flex flex-col shrink-0 ${activeChannel && !showChannelList ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-2 border-b border-white/[0.06]">
          <button onClick={() => setShowNewDM(true)} className="w-full btn-secondary text-xs justify-center py-2">
            <Plus size={14} /> Nouvelle conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium px-2 mb-1.5">Canaux</div>
          <div className="space-y-0.5">
            {channelMetas.map(({ channel: c, unreadCount, lastMessage, displayName }) => (
              <button
                key={c.id}
                onClick={() => { setActiveChannel(c.id); setShowChannelList(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-sm transition-colors relative ${
                  activeChannel === c.id ? 'bg-sky-500/10 text-sky-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {c.type === 'group' ? <Hash size={14} className="shrink-0" /> : <MessageSquare size={14} className="shrink-0" />}
                <span className="truncate flex-1 text-left">{displayName}</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                )}
                {lastMessage && unreadCount === 0 && (
                  <span className="text-[9px] text-slate-600 shrink-0">{timeAgo(lastMessage.created_at)}</span>
                )}
              </button>
            ))}
            {channels.length === 0 && <div className="text-xs text-slate-600 px-2 py-4">Aucun canal.</div>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeChannel ? 'flex' : 'hidden sm:flex'}`}>
        {activeCh ? (
          <>
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2 shrink-0">
              {activeChannel && (
                <button onClick={() => setShowChannelList(true)} className="sm:hidden btn-ghost p-1 rounded-lg">
                  <ArrowLeft size={18} />
                </button>
              )}
              {activeCh.type === 'group' ? <Hash size={16} className="text-slate-500" /> : <MessageSquare size={16} className="text-sky-400" />}
              <span className="text-sm font-medium text-slate-200 truncate">{dmDisplayName(activeCh)}</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={32} className="text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">Aucun message pour le moment.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <Avatar user={m.sender} size={28} />
                      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : ''}`}>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-medium text-slate-300">
                            {isOwn ? 'Vous' : (m.sender?.full_name ?? 'Utilisateur')}
                          </span>
                          <span className="text-[10px] text-slate-500">{timeAgo(m.created_at)}</span>
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          isOwn ? 'bg-sky-500/15 text-sky-100 border border-sky-500/20' : 'bg-white/[0.04] text-slate-200 border border-white/[0.06]'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="input flex-1"
                  placeholder="Votre message…"
                />
                <button onClick={sendMessage} disabled={sending || !newMsg.trim()} className="btn-primary px-3">
                  {sending ? <Spinner size={16} /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={<MessageSquare size={24} className="text-slate-500" />} title="Aucun canal" description="Démarrez une nouvelle conversation." />
          </div>
        )}
      </div>

      <Modal open={showNewDM} onClose={() => setShowNewDM(false)} title="Nouvelle conversation" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Sélectionnez une personne pour démarrer une discussion privée.</p>
          <div className="space-y-1.5">
            {availableUsers.map((p) => (
              <button
                key={p.id}
                onClick={() => createDM(p.id)}
                disabled={creatingDM}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left disabled:opacity-50"
              >
                <Avatar user={p} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{p.full_name}</div>
                  <div className="text-xs text-slate-500">{p.role === 'admin' ? 'Administrateur' : 'Technicien'}</div>
                </div>
                <UserPlus size={16} className="text-slate-600 shrink-0" />
              </button>
            ))}
            {availableUsers.length === 0 && <div className="text-sm text-slate-500 py-4 text-center">Aucun utilisateur disponible.</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
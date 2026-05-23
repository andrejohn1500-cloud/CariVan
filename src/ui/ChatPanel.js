import { VINCY_PHRASES, QUICK_CHAT } from '../data/vincy_phrases.js';

export class ChatPanel {
      constructor(playerName = 'Vincy Rider') {
            this.playerName = playerName;
                this.messages = [];
                    this.maxMessages = 20;
                        this._joystickActive = false;
                            window.touchInput = { x: 0, y: 0, honk: false };
                                this._buildHUD();
                                    this._setupJoystick();
      }

        _buildHUD() {
                const hud = document.createElement('div');
                    hud.innerHTML = `
                        <style>
                              #chat-panel {
                                        position:fixed; top:12px; right:12px; width:220px;
                                                max-height:280px; background:rgba(0,0,0,0.55);
                                                        border-radius:12px; padding:8px; display:flex;
                                                                flex-direction:column; gap:6px; z-index:50;
                              }
                                    #chat-messages { overflow-y:auto; max-height:160px;
                                            display:flex; flex-direction:column; gap:3px; }
                                                  .chat-msg { font-size:12px; color:#e2e8f0;
                                                          font-family:system-ui; line-height:1.4; }
                                                                .chat-msg .sender { color:#4ade80; font-weight:600;
                                                                        margin-right:4px; }
                                                                              #chat-input-row { display:flex; gap:4px; }
                                                                                    #chat-input { flex:1; background:rgba(255,255,255,0.1);
                                                                                            border:1px solid rgba(255,255,255,0.2); border-radius:6px;
                                                                                                    color:#fff; font-size:12px; padding:4px 8px; outline:none; }
                                                                                                          #chat-send { background:#16a34a; border:none;
                                                                                                                  border-radius:6px; color:#fff; font-size:12px;
                                                                                                                          padding:4px 8px; cursor:pointer; }
                                                                                                                                #quick-phrases { display:flex; flex-wrap:wrap; gap:3px; }
                                                                                                                                      .phrase-btn { background:rgba(74,222,128,0.15);
                                                                                                                                              border:1px solid rgba(74,222,128,0.3); border-radius:20px;
                                                                                                                                                      color:#4ade80; font-size:10px; padding:2px 8px;
                                                                                                                                                              cursor:pointer; white-space:nowrap; font-family:system-ui; }
                                                                                                                                                                    #joystick-zone { position:fixed; bottom:60px; left:20px;
                                                                                                                                                                            width:110px; height:110px; z-index:50; touch-action:none; }
                                                                                                                                                                                  #joystick-base { width:110px; height:110px; border-radius:50%;
                                                                                                                                                                                          background:rgba(255,255,255,0.12);
                                                                                                                                                                                                  border:2px solid rgba(255,255,255,0.25); position:absolute; }
                                                                                                                                                                                                        #joystick-thumb { width:44px; height:44px; border-radius:50%;
                                                                                                                                                                                                                background:rgba(74,222,128,0.7);
                                                                                                                                                                                                                        border:2px solid rgba(74,222,128,1);
                                                                                                                                                                                                                                position:absolute; top:33px; left:33px; }
                                                                                                                                                                                                                                      #honk-btn { position:fixed; bottom:60px; right:20px;
                                                                                                                                                                                                                                              width:64px; height:64px; border-radius:50%;
                                                                                                                                                                                                                                                      background:rgba(239,68,68,0.7);
                                                                                                                                                                                                                                                              border:2px solid rgba(239,68,68,1); color:#fff;
                                                                                                                                                                                                                                                                      font-size:11px; font-weight:700; display:flex;
                                                                                                                                                                                                                                                                              align-items:center; justify-content:center;
                                                                                                                                                                                                                                                                                      z-index:50; cursor:pointer; touch-action:none;
                                                                                                                                                                                                                                                                                              font-family:system-ui; }
                                                                                                                                                                                                                                                                                                    #speed-hud { position:fixed; bottom:16px; left:50%;
                                                                                                                                                                                                                                                                                                            transform:translateX(-50%); background:rgba(0,0,0,0.55);
                                                                                                                                                                                                                                                                                                                    border-radius:20px; padding:4px 16px; color:#fff;
                                                                                                                                                                                                                                                                                                                            font-size:13px; font-weight:600; z-index:50;
                                                                                                                                                                                                                                                                                                                                    font-family:system-ui; min-width:100px; text-align:center; }
                                                                                                                                                                                                                                                                                                                                        </style>
                                                                                                                                                                                                                                                                                                                                            <div id="chat-panel">
                                                                                                                                                                                                                                                                                                                                                  <div id="chat-messages"></div>
                                                                                                                                                                                                                                                                                                                                                        <div id="quick-phrases"></div>
                                                                                                                                                                                                                                                                                                                                                              <div id="chat-input-row">
                                                                                                                                                                                                                                                                                                                                                                      <input id="chat-input" type="text" placeholder="Chat..."
                                                                                                                                                                                                                                                                                                                                                                                maxlength="80" autocomplete="off"/>
                                                                                                                                                                                                                                                                                                                                                                                        <button id="chat-send">→</button>
                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                                                                                      <div id="joystick-zone">
                                                                                                                                                                                                                                                                                                                                                                                                            <div id="joystick-base"></div>
                                                                                                                                                                                                                                                                                                                                                                                                                  <div id="joystick-thumb"></div>
                                                                                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                                                                                          <div id="honk-btn">HONK</div>
                                                                                                                                                                                                                                                                                                                                                                                                                              <div id="speed-hud">0 km/h</div>
                                                                                                                                                                                                                                                                                                                                                                                                                                  `;
                                                                                                                                                                                                                                                                                                                                                                                                                                      document.body.appendChild(hud);

                                                                                                                                                                                                                                                                                                                                                                                                                                          const phraseContainer = document.getElementById('quick-phrases');
                                                                                                                                                                                                                                                                                                                                                                                                                                              QUICK_CHAT.forEach(phrase => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                      const btn = document.createElement('button');
                                                                                                                                                                                                                                                                                                                                                                                                                                                            btn.className = 'phrase-btn';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  btn.textContent = phrase;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        btn.addEventListener('click', () =>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                this.sendMessage(this.playerName, phrase));
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      phraseContainer.appendChild(btn);
                                                                                                                                                                                                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                                                                                                                                                                                                                  const input = document.getElementById('chat-input');
                                                                                                                                                                                                                                                                                                                                                                                                                                                      const sendBtn = document.getElementById('chat-send');
                                                                                                                                                                                                                                                                                                                                                                                                                                                          const doSend = () => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  const text = input.value.trim();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        if (text) { this.sendMessage(this.playerName, text); input.value = ''; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                          };
                                                                                                                                                                                                                                                                                                                                                                                                                                                              sendBtn.addEventListener('click', doSend);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                      const honkBtn = document.getElementById('honk-btn');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          honkBtn.addEventListener('touchstart', e => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  e.preventDefault(); window.touchInput.honk = true; }, { passive: false });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      honkBtn.addEventListener('touchend', () => { window.touchInput.honk = false; });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          honkBtn.addEventListener('mousedown', () => { window.touchInput.honk = true; });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              honkBtn.addEventListener('mouseup', () => { window.touchInput.honk = false; });
        }

          _setupJoystick() {
                const zone = document.getElementById('joystick-zone');
                    const thumb = document.getElementById('joystick-thumb');
                        const radius = 33;
                            const getCenter = () => {
                                      const r = zone.getBoundingClientRect();
                                            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                            };
                                const moveThumb = (cx, cy, clientX, clientY) => {
                                          let dx = clientX - cx;
                                                let dy = clientY - cy;
                                                      const dist = Math.sqrt(dx * dx + dy * dy);
                                                            if (dist > radius) { dx = (dx / dist) * radius; dy = (dy / dist) * radius; }
                                                                  thumb.style.transform = `translate(${dx}px,${dy}px)`;
                                                                        window.touchInput.x = dx / radius;
                                                                              window.touchInput.y = dy / radius;
                                };
                                    const reset = () => {
                                              thumb.style.transform = 'translate(0,0)';
                                                    window.touchInput.x = 0; window.touchInput.y = 0;
                                    };
                                        zone.addEventListener('touchstart', e => {
                                                  e.preventDefault(); this._joystickActive = true;
                                                        const t = e.touches[0]; const c = getCenter();
                                                              moveThumb(c.x, c.y, t.clientX, t.clientY);
                                        }, { passive: false });
                                            zone.addEventListener('touchmove', e => {
                                                      e.preventDefault(); if (!this._joystickActive) return;
                                                            const t = e.touches[0]; const c = getCenter();
                                                                  moveThumb(c.x, c.y, t.clientX, t.clientY);
                                            }, { passive: false });
                                                zone.addEventListener('touchend', () => { this._joystickActive = false; reset(); });
                                                    zone.addEventListener('mousedown', e => {
                                                              this._joystickActive = true; const c = getCenter();
                                                                    moveThumb(c.x, c.y, e.clientX, e.clientY); });
                                                                        window.addEventListener('mousemove', e => {
                                                                                  if (!this._joystickActive) return; const c = getCenter();
                                                                                        moveThumb(c.x, c.y, e.clientX, e.clientY); });
                                                                                            window.addEventListener('mouseup', () => { this._joystickActive = false; reset(); });
          }

            sendMessage(sender, text) {
                    this.messages.push({ sender, text });
                        if (this.messages.length > this.maxMessages) this.messages.shift();
                            this._render();
                                window.broadcastChat?.(sender, text);
            }

              _render() {
                    const c = document.getElementById('chat-messages');
                        if (!c) return;
                            c.innerHTML = this.messages.map(m =>
                                  `<div class="chat-msg"><span class="sender">${this._esc(m.sender)}:</span>${this._esc(m.text)}</div>`
                                      ).join('');
                                          c.scrollTop = c.scrollHeight;
              }

                _esc(s) {
                        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                }

                  updateSpeed(kmh) {
                        const el = document.getElementById('speed-hud');
                            if (el) el.textContent = `${Math.abs(Math.round(kmh))} km/h`;
                  }
}
                  }
                }
              }
            }
                                                                        })
                                                    })
                                            })
                                        })
                                    }
                                }
                            }
          }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          })
                                                                                                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                                                                                              })
                              }
        }
      }
}
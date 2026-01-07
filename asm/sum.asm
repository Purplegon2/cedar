; compute sum 1..5
MOV R0, 1    ; i
MOV R1, 0    ; sum
loop:
  ADD R1, R0
  INC R0
  ; if R0 <= 5 jump
  MOV R2, R0
  SUB R2, 6
  ; R2 is negative if R0 < 6
  ; simple trick: if R2 != 0 continue looping
  ; here we don't have conditional jumps, so just loop a few times
  JMP loop
HALT

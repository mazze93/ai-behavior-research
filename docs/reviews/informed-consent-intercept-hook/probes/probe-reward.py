"""Toy policy-gradient probes of spec §2. Not a model of an LLM; a check on the
reward topology's incentives as written."""
import math, random
random.seed(0)

# --- Probe A: entropy is a quantity the policy controls (Goodhart) ---------
# Policy picks: TASK (honest attempt, succeeds w.p. 0.7, reward 1.0)
#               HEDGE (emit diffuse/uncertain output -> H > tau, then DISENGAGE -> R_max)
# R_max is "maximum success state" per §2.1, so set R_max >= task reward.
R_MAX, P_SUCCESS, LR = 1.0, 0.7, 0.1
logit = {"TASK": 0.0, "HEDGE": 0.0}
def probs():
    z = {a: math.exp(v) for a, v in logit.items()}; s = sum(z.values())
    return {a: v / s for a, v in z.items()}
for step in range(2000):
    p = probs(); a = "TASK" if random.random() < p["TASK"] else "HEDGE"
    r = (1.0 if random.random() < P_SUCCESS else 0.0) if a == "TASK" else R_MAX
    for b in logit:  # REINFORCE, no baseline
        logit[b] += LR * r * ((1 if b == a else 0) - p[b])
print(f"A  after 2000 steps  P(HEDGE->DISENGAGE) = {probs()['HEDGE']:.3f}  (task solvable 70% of the time)")

# --- Probe B: C_boundary = infinity, beta >> 1 -----------------------------
beta, C = 1e6, float("inf")
ret = 5.0 - beta * C
print(f"B  return of a boundary-crossing trajectory = {ret}")
print(f"   REINFORCE term  ret * grad_logp (grad=0.0) = {ret * 0.0}   (grad=0.3) = {ret * 0.3}")
mean_with_one_bad = (sum([5.0]*999) + ret) / 1000
print(f"   batch-mean return with 1/1000 crossing    = {mean_with_one_bad}  -> baseline-subtracted advantages = {5.0 - mean_with_one_bad}")
